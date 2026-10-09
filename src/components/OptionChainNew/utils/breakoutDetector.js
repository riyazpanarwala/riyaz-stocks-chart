import { THRESHOLDS } from "../constants.js";
import { aggregateActivity, crossedLevel, legActivity, matchedSnapshots, nearestLevels, sessionDate } from "./analysis.js";
import { strikePitch } from "./parsers.js";
import { isFresh, marketTimestamp } from "./tradeRules.js";

export function pushSnapshot(history, snapshot) {
  if (!Number.isFinite(snapshot.ts)) return history;
  const last = history.at(-1);
  if (last && (last.contractKey !== snapshot.contractKey || sessionDate(last.ts) !== sessionDate(snapshot.ts))) history=[];
  else if (last && snapshot.ts < last.ts) return history;
  else if (last && snapshot.ts === last.ts) {
    const equal = last.spot === snapshot.spot && last.pcr === snapshot.pcr && last.rows.length === snapshot.rows.length &&
      last.rows.every((row,i) => row.strikePrice === snapshot.rows[i]?.strikePrice && ["CE","PE"].every(side =>
        ["openInterest","changeinOpenInterest","lastPrice","totalTradedVolume","bidprice","askPrice"].every(key =>
          row[side]?.[key] === snapshot.rows[i]?.[side]?.[key])));
    return equal ? history : [...history.slice(0,-1),snapshot];
  }
  // Each new exchange timestamp is useful for elapsed-time windows, even when
  // metrics are unchanged. Repeated source timestamps never advance history.
  return [...history, snapshot].slice(-Math.max(10, THRESHOLDS.MAX_SNAPSHOTS));
}

export function detectBreakouts({ rows, spot, pcr, maxPain, snapshots = [], candles = [], timestamp, now = Date.now(), marketOpen = false }) {
  if (!rows?.length || !(spot>0) || !marketOpen || !isFresh(timestamp,now)) return [];
  const current=snapshots.at(-1), previous=snapshots.at(-2);
  const pitch=strikePitch(rows,spot), levels=nearestLevels(rows,spot), signals=[];
  const add=(id,type,title,detail,strike=null,strength=40)=>signals.push({id,type,title,detail,strike,strength,source:"Matched snapshots"});
  for(const [side,level] of [["CE",levels.resistance],["PE",levels.support]]) {
    if(level!=null && Math.abs(level-spot)<=pitch*0.5)
      add("WATCH_"+side,side==="CE"?"BREAKOUT_WATCH":"BREAKDOWN_WATCH","Testing "+side+" OI barrier at "+level,
        "OI concentration is a candidate barrier; wait for a completed close across the previous level.",level);
  }
  if(Number.isFinite(pcr) && (pcr>1.8 || pcr<0.5)) add("PCR_CONCENTRATION","OBSERVATION","Extreme OI PCR: "+pcr.toFixed(2),
    "Relative put/call concentration does not identify trade direction or a reversal.",null,25);
  if(maxPain>0 && Math.abs(spot-maxPain)>pitch*2) add("MAX_PAIN_DISTANCE","OBSERVATION","Spot is "+Math.abs(spot-maxPain).toFixed(0)+" points from Max Pain",
    "Max Pain minimizes intrinsic payout using current OI; this distance is descriptive.",maxPain,20);
  if(!current || !previous || current.ts !== marketTimestamp(timestamp)) return signals;
  const context={mode:"intraday",prevRows:previous.rows,timestamp:current.ts,prevTimestamp:previous.ts,now,
    expiry:current.contractKey,prevExpiry:previous.contractKey};
  if(!matchedSnapshots(context)) return signals;
  const oldLevels=nearestLevels(previous.rows,previous.spot);
  const elapsed=Math.round((current.ts-previous.ts)/1000);
  for(const [side,level,direction] of [["CE",oldLevels.resistance,1],["PE",oldLevels.support,-1]]) {
    const row=rows.find(r=>r.strikePrice===level);
    if(crossedLevel(candles,level,direction,now,spot) && legActivity(row,side,context).type==="Short Covering")
      add("CROSS_"+side,direction===1?"BULLISH_BREAKOUT":"BEARISH_BREAKDOWN","Completed close crossed "+level,
        side+" inferred short covering over "+elapsed+"s confirms the previous barrier crossing.",level,85);
    const rank=(rs,base)=>rs.filter(r=>side==="CE"?r.strikePrice>base:r.strikePrice<base)
      .filter(r=>r[side]?.openInterest>0).sort((a,b)=>b[side].openInterest-a[side].openInterest)[0];
    const before=rank(previous.rows,previous.spot), after=rank(rows,spot);
    if(before&&after&&before.strikePrice!==after.strikePrice) add("MIGRATION_"+side,"OBSERVATION",
      side+" OI wall moved "+before.strikePrice+" → "+after.strikePrice,"Migration over "+elapsed+"s is descriptive until price crosses the previous level.",after.strikePrice,30);
  }
  // Select a real elapsed-time window, rather than always selecting three ticks.
  const window=snapshots.filter(s=>s.contractKey===current.contractKey && sessionDate(s.ts)===sessionDate(current.ts) && current.ts-s.ts<=180000);
  const first=window.find(s=>current.ts-s.ts>=90000);
  if(first && window.length>=4) {
    const move=current.spot-first.spot, direction=Math.sign(move);
    const points=window.filter(s=>s.ts>=first.ts);
    const monotonic=points.slice(1).every((s,i)=>direction*(s.spot-points[i].spot)>=0);
    const activity=aggregateActivity(rows,current.atm,pitch,context);
    if(monotonic && Math.abs(move)/pitch>THRESHOLDS.VELOCITY_MIN_PCT && activity.bias===direction)
      add("VELOCITY",direction===1?"BULLISH_MOMENTUM":"BEARISH_MOMENTUM","Spot moved "+move.toFixed(0)+" points in "+Math.round((current.ts-first.ts)/1000)+"s",
        "Observed price momentum agrees with inferred positioning; this does not confirm a level breakout.",null,60);
  }
  return signals.sort((a,b)=>b.strength-a.strength);
}

const SIGNAL_META_MAP = {
  BULLISH: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🟢", label: "Bullish" },
  BEARISH: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "🔴", label: "Bearish" },
  BULLISH_BREAKOUT: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🚀", label: "Bullish Breakout" },
  BEARISH_BREAKDOWN: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "📉", label: "Bearish Breakdown" },
  BULLISH_MOMENTUM: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "▲", label: "Bullish Momentum" },
  BEARISH_MOMENTUM: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "▼", label: "Bearish Momentum" },
  BREAKOUT_WATCH: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "👀", label: "Watch Zone" },
  BREAKDOWN_WATCH: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚠️", label: "Watch Zone" },
  RESISTANCE_BUILDING: { color: "#f85149", bg: "#2a0d0d", border: "#f8514944", icon: "🧱", label: "Resistance Building" },
  SUPPORT_BUILDING: { color: "#3fb950", bg: "#0d2a16", border: "#3fb95044", icon: "🛡️", label: "Support Building" },
  MEAN_REVERT_DOWN: { color: "#c084fc", bg: "#1a0a1a", border: "#c084fc44", icon: "↩", label: "Pull-back Risk" },
  MEAN_REVERT_UP: { color: "#c084fc", bg: "#1a0a1a", border: "#c084fc44", icon: "↪", label: "Recovery Likely" },
  BULLISH_REVERSAL_RISK: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚡", label: "Reversal Risk" },
  BEARISH_REVERSAL_RISK: { color: "#e3b341", bg: "#1c1400", border: "#e3b34144", icon: "⚡", label: "Reversal Risk" },
};
const DEFAULT_META = { color: "#8b949e", bg: "#1c2128", border: "#21262d", icon: "◆", label: "" };

/**
 * Get colour / icon metadata for a signal type string.
 * @param {string} type
 * @returns {object}
 */
export function breakoutSignalMeta(type) {
  return SIGNAL_META_MAP[type] ?? { ...DEFAULT_META, label: type };
}
