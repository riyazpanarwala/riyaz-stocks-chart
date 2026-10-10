import test from "node:test";
import assert from "node:assert/strict";
import { aggregateActivity, classifyChange, crossedLevel, legActivity, matchedSnapshots, nearestLevels, wallState } from "../../src/components/OptionChainNew/utils/analysis.js";
import { buildupType, calcPCR, calcPCRFull, calcMaxPain, parseIndexChain, strikePitch } from "../../src/components/OptionChainNew/utils/parsers.js";
import { pcrLabel } from "../../src/components/OptionChainNew/utils/formatters.js";
import { analyzePcrTrend, calcVolumePCRFull, getPcrSentiment } from "../../src/components/OptionChainNew/utils/maxPainPcrEngine.js";
import { calcInstitutional, diffInstitutional } from "../../src/components/OptionChainNew/utils/institutionalAnalysis.js";
import { detectBreakouts, pushSnapshot } from "../../src/components/OptionChainNew/utils/breakoutDetector.js";
import { analyzeOILevels, calculateWeightedOptionScore } from "../../src/engine/options/nextDayOptionSignalEngine.js";
import { generateSignal } from "../../src/components/OptionChainNew/utils/signalEngine.js";

const now=Date.parse("2026-10-09T05:00:00Z"), expiry="13-Oct-2026";
const leg=(overrides={})=>({lastPrice:100,change:0,openInterest:100000,changeinOpenInterest:0,
  totalTradedVolume:10000,bidprice:99.5,askPrice:100.5,expiryDate:expiry,...overrides});
const row=(strikePrice,ce={},pe={})=>({strikePrice,CE:leg(ce),PE:leg(pe)});
const context=(prevRows,overrides={})=>({mode:"intraday",prevRows,timestamp:now,prevTimestamp:now-30000,now,marketOpen:true,...overrides});
const candles=(a,b)=>[{date:new Date(now-600000).toISOString(),open:a-1,close:a,high:a+1,low:a-2},
  {date:new Date(now-300000).toISOString(),open:b-1,close:b,high:b+1,low:b-2}];

test("Buildup requires both nonzero changes; configurable noise does not imply a quadrant",()=>{
  for(const [price,oi] of [[0,100],[0,-100],[2,0],[-2,0],[0,0]]) assert.equal(classifyChange(price,oi),"No Change");
  assert.equal(classifyChange(null,100),"Unavailable");
  assert.equal(classifyChange(0.1,100,{priceNoise:0.2}),"No Change");
  assert.equal(classifyChange(1,2,{oiNoise:3}),"No Change");
  assert.equal(buildupType(row(100,{change:2,changeinOpenInterest:100}),"CE"),"Long Build-up");
});

test("Daily and intraday classifications use aligned price/OI baselines",()=>{
  const current=row(100,{change:10,changeinOpenInterest:1000,lastPrice:90,openInterest:101000});
  const previous=row(100,{lastPrice:100,openInterest:100000,totalTradedVolume:9000});
  assert.equal(legActivity(current,"CE").type,"Long Build-up");
  assert.equal(legActivity(current,"CE",context([previous])).type,"Short Build-up");
  assert.equal(legActivity(current,"CE",context([{...previous,CE:{...previous.CE,expiryDate:"20-Oct-2026"}}])).type,"Unavailable");
});

test("Classified contract aggregates cannot call large put buying put writing because of one tiny writing leg",()=>{
  const rows=[row(100,{}, {change:-1,changeinOpenInterest:1,openInterest:1}),
    row(110,{}, {change:10,changeinOpenInterest:200000,openInterest:250000})];
  const activity=aggregateActivity(rows,100,10);
  assert.equal(activity.PE["Short Build-up"].contracts,1);
  assert.equal(activity.PE["Long Build-up"].contracts,200000);
  assert.equal(activity.bias,-1);
  const inst=calcInstitutional(rows,105,100,10);
  assert.notEqual(inst.smartBias,"BULLISH");
  assert.equal(inst.traps.length,0);
});

test("PCR normalizes numeric strings and reports absent/invalid denominators as unavailable",()=>{
  const rows=[row(100,{openInterest:"100"},{openInterest:"100"}),row(110,{openInterest:"200"},{openInterest:"100"})];
  assert.equal(calcPCR(rows),2/3);
  assert.equal(calcPCRFull([{s:100,c:"100",p:"100"},{s:110,c:"200",p:"100"}]),2/3);
  for(const value of [null,NaN,Infinity,-1]) {
    assert.equal(pcrLabel(value),"Unavailable");
    assert.equal(getPcrSentiment(value).sentiment,"neutral");
  }
  assert.equal(calcPCR([]),null);
  assert.equal(calcPCR([row(100,{openInterest:0})]),null);
  assert.equal(calcPCR([row(100,{openInterest:"broken"})]),null);
  assert.equal(calcVolumePCRFull([{s:100,c:100,p:200}]),null);
  assert.equal(calcVolumePCRFull([{cVol:"100",pVol:"250"}]),2.5);
});

test("Index analysis retains every expiry-isolated strike while display remains separate",()=>{
  const fullData=[row(90),row(100),row(110)];
  const rows=parseIndexChain({fullData,displayData:[fullData[1]]});
  assert.equal(rows.length,3);
  const normalized=parseIndexChain({data:[{strikePrice:"100",CE:{...leg(),openInterest:"200"},PE:leg()}]});
  assert.equal(normalized[0].strikePrice,100);
  assert.equal(normalized[0].CE.openInterest,200);
});

test("Positive-additions PCR is distinct from signed net OI and has no invented fallback",()=>{
  const levels=analyzeOILevels([row(100,{changeinOpenInterest:-100},{changeinOpenInterest:200})],105,100);
  assert.equal(levels.totalCeChgOI,-100);
  assert.equal(levels.totalPeChgOI,200);
  assert.equal(levels.changeOiPcr,null);
  assert.equal(levels.positiveAdditionsPCR,null);
  const flat=aggregateActivity([row(100,{changeinOpenInterest:100},{changeinOpenInterest:200})],100,10);
  assert.equal(flat.positiveAdditionsPCR,2);
  assert.equal(flat.bias,0);
});

test("Interval volume ignores decreasing counters and rejects session/expiry transitions",()=>{
  const previous=row(100,{totalTradedVolume:5000}), current=row(100,{totalTradedVolume:5100});
  assert.equal(legActivity(current,"CE",context([previous])).volume,100);
  assert.equal(legActivity(previous,"CE",context([current])).volume,null);
  assert.equal(matchedSnapshots(context([previous],{expiry,prevExpiry:"20-Oct-2026"})),false);
  const midnight=Date.parse("2026-10-08T18:30:10Z");
  assert.equal(matchedSnapshots(context([previous],{now:midnight,timestamp:midnight,prevTimestamp:midnight-20000})),false);
  assert.equal(matchedSnapshots(context([previous],{prevTimestamp:now-120001})),false);
});

test("Nearest barriers consider all candidates; pitch uses local median without outlier gaps",()=>{
  const rows=[row(100),row(110,{openInterest:1}),row(120,{openInterest:200000}),row(130,{openInterest:300000}),row(140,{openInterest:400000})];
  assert.equal(nearestLevels(rows,105).resistance,110);
  assert.equal(analyzeOILevels(rows,105,100).resistance1,110);
  assert.equal(strikePitch([100,150,200,1000].map(s=>row(s))),50);
  assert.equal(strikePitch([row(200),row(100),row(150),row(150)]),50);
  assert.equal(wallState(row(110,{change:-1,changeinOpenInterest:100}),"CE"),"Inferred writing");
  assert.equal(wallState(row(110,{change:1,changeinOpenInterest:-100}),"CE"),"Inferred covering");
});

test("PCR alone neither grants directional score nor authorizes an entry",()=>{
  const rows=[row(90),row(100),row(110)], previous=rows.map(r=>({...r,CE:{...r.CE,totalTradedVolume:9000},PE:{...r.PE,totalTradedVolume:9000}}));
  const c=context(previous,{candles:candles(100,101)});
  const high=generateSignal(rows,100,10,102,c), low=generateSignal(rows,100,0.1,102,c);
  assert.equal(high.strength,low.strength);
  assert.equal(high.rawSignal,"NO TRADE");
});

test("A newly discovered nearer wall constrains risk/reward even outside the strongest three",()=>{
  const rows=[row(100,{}, {lastPrice:90}),row(110,{openInterest:1000},{lastPrice:90}),row(120,{openInterest:200000},{lastPrice:90}),
    row(130,{openInterest:300000},{lastPrice:90}),row(140,{openInterest:400000},{lastPrice:90})];
  const previous=rows.map(r=>({...r,CE:{...r.CE,lastPrice:90,openInterest:r.CE.openInterest+100,totalTradedVolume:9000},
    PE:{...r.PE,lastPrice:100,openInterest:r.PE.openInterest-100,totalTradedVolume:9000}}));
  const result=generateSignal(rows,100,2,108,context(previous,{candles:candles(106,107)}));
  assert.equal(result.nearestResistance,110);
  assert.equal(result.rawSignal,"NO TRADE");
  assert.match(result.reason,/risk\/reward/);
});

test("Breakouts require an actual completed crossing plus same-strike inferred covering",()=>{
  const previous=[row(90),row(100)], current=[row(90),row(100,{openInterest:90000,lastPrice:110,totalTradedVolume:11000})];
  const snapshots=[{rows:previous,spot:99,atm:100,ts:now-30000,contractKey:expiry},
    {rows:current,spot:102,atm:100,ts:now,contractKey:expiry}];
  const args={rows:current,spot:102,pcr:1,maxPain:100,snapshots,timestamp:now,now,marketOpen:true,candles:candles(99,101)};
  assert.equal(crossedLevel(args.candles,100,1,now,102),true);
  assert.ok(detectBreakouts(args).some(s=>s.type==="BULLISH_BREAKOUT"));
  assert.ok(!detectBreakouts({...args,candles:candles(101,102)}).some(s=>s.type==="BULLISH_BREAKOUT"));
  const buying=current.map(r=>r.strikePrice===100?{...r,CE:{...r.CE,openInterest:110000}}:r);
  assert.ok(!detectBreakouts({...args,rows:buying}).some(s=>s.type==="BULLISH_BREAKOUT"));
  assert.deepEqual(detectBreakouts({...args,timestamp:now-120001}),[]);
  assert.deepEqual(detectBreakouts({...args,marketOpen:false}),[]);
});

test("Snapshot duplicate detection sees premium/volume revisions and resets contract/session",()=>{
  const initial={rows:[row(100)],spot:100,pcr:1,ts:now,contractKey:expiry};
  const history=pushSnapshot([],initial);
  assert.equal(pushSnapshot(history,initial),history);
  const revision={...initial,rows:[row(100,{lastPrice:101,totalTradedVolume:10001})]};
  const revised=pushSnapshot(history,revision);
  assert.equal(revised.length,1);
  assert.equal(revised[0].rows[0].CE.lastPrice,101);
  assert.equal(pushSnapshot(history,{...revision,ts:now+30000}).length,2);
  assert.equal(pushSnapshot(history,{...revision,ts:now+86400000}).length,1);
  assert.equal(pushSnapshot(history,{...revision,contractKey:"other"}).length,1);
});

test("30-second polling can satisfy velocity's real 90-second window",()=>{
  const snapshots=[0,1,2,3].map(i=>({ts:now-90000+i*30000,spot:100+i*10,atm:100,contractKey:expiry,
    rows:[row(90,{lastPrice:100+i,openInterest:100000-i*1000}),row(100,{lastPrice:100+i,openInterest:100000-i*1000}),row(110)]}));
  const latest=snapshots.at(-1);
  const signals=detectBreakouts({rows:latest.rows,spot:latest.spot,snapshots,pcr:1,maxPain:100,timestamp:now,now,marketOpen:true});
  assert.ok(signals.some(s=>s.id==="VELOCITY" && s.title.includes("90s")));
});

test("Smart Money changes use actual elapsed time and suppress stale data",()=>{
  const old=[row(100)], current=[row(100,{openInterest:110000,lastPrice:90,totalTradedVolume:11000})];
  const alerts=diffInstitutional(old,current,100,context(old));
  assert.match(alerts[0].label,/over 30s/);
  assert.ok(!alerts.some(a=>a.type==="TRAP"));
  assert.deepEqual(diffInstitutional(old,current,100,context(old,{timestamp:null})),[]);
});

test("Synthetic anchors cannot create PCR trends or migration; zero OI has no Max Pain",()=>{
  const real={ts:now,spot:100,pcr:1,maxPain:100};
  const trend=analyzePcrTrend([{...real,ts:now-900000,pcr:0.5,maxPain:90,isSyntheticAnchor:true},real],100,100);
  assert.equal(trend.historyCount,1);
  assert.equal(trend.pcrChange,0);
  assert.equal(trend.maxPainMigration,null);
  assert.equal(trend.divergence,null);
  assert.equal(calcMaxPain([row(100,{openInterest:0},{openInterest:0})]),0);
});

test("Next-day confirms three independent domains; IV/volume skew are never directional votes",()=>{
  const rows=[90,100,110].map(s=>row(s,{change:2,changeinOpenInterest:-10000},{change:-2,changeinOpenInterest:20000}));
  const args={spot:105,open:100,high:106,low:99,prevClose:100,vwap:102,marketStructureInfo:{structure:"STRONG BULLISH"},
    oiLevels:analyzeOILevels(rows,105,100),rows,atm:100};
  const score=calculateWeightedOptionScore(args);
  assert.deepEqual(score.confirmedGroups.bullish,["underlying price","classified positioning","execution liquidity"]);
  assert.deepEqual(score.factorBreakdown.iv,{bull:0,bear:0});
  const changed=rows.map(r=>({...r,CE:{...r.CE,impliedVolatility:99,totalTradedVolume:100000},PE:{...r.PE,impliedVolatility:1,totalTradedVolume:1000}}));
  assert.equal(calculateWeightedOptionScore({...args,rows:changed}).finalScore,score.finalScore);
  const illiquid=rows.map(r=>({...r,CE:{...r.CE,bidprice:null}}));
  assert.equal(calculateWeightedOptionScore({...args,rows:illiquid}).confirmedGroups.bullish.length,2);
  const noPrice=calculateWeightedOptionScore({...args,spot:100,open:100,prevClose:100});
  assert.ok(!noPrice.confirmedGroups.bullish.includes("underlying price"));
  assert.ok(noPrice.finalScore<60);
});
