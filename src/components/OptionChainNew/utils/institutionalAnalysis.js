import { aggregateActivity, legActivity, matchedSnapshots, numeric, wallState } from "./analysis.js";
import { strikePitch } from "./parsers.js";
import { confirmedDirection, marketTimestamp } from "./tradeRules.js";
import { fmtN } from "./formatters.js";

// Chain data supports inferred activity, not trader identity or entry cost basis.
export function calcInstitutional(rows, spot, atm, pcr, context = {}) {
  if (!rows?.length) return null;
  const pitch = strikePitch(rows, spot);
  const activity = aggregateActivity(rows, atm, pitch, context);
  const ranked = (side, filter = () => true) => rows.filter(r => filter(r) && numeric(r[side]?.openInterest) > 0)
    .sort((a,b) => b[side].openInterest - a[side].openInterest).slice(0,3);
  const top3Ce = ranked("CE"), top3Pe = ranked("PE");
  const totalCeOI = rows.reduce((s,r) => s + Math.max(0, numeric(r.CE?.openInterest) ?? 0),0);
  const totalPeOI = rows.reduce((s,r) => s + Math.max(0, numeric(r.PE?.openInterest) ?? 0),0);
  const topRes = ranked("CE", r => r.strikePrice > spot).map(r => ({ ...r, zoneState: wallState(r,"CE",context) }));
  const topSup = ranked("PE", r => r.strikePrice < spot).map(r => ({ ...r, zoneState: wallState(r,"PE",context) }));
  const candidates = rows.flatMap(r => ["CE","PE"].map(side => {
    const a = legActivity(r, side, context);
    return { strike: r.strikePrice, side, doi: a.oi, vol: a.volume, ltp: r[side]?.lastPrice,
      chg: a.price, type: "Inferred " + a.type.toLowerCase() + " (" + activity.timeframe + ")",
      highConv: a.volume > 0 && a.type !== "No Change" && a.type !== "Unavailable",
      nearness: Math.abs(r.strikePrice-atm) <= pitch*2 ? "Near current price" : "Far from price" };
  })).filter(a => a.doi != null && Math.abs(a.doi) > 0 && !a.type.includes("unavailable") && !a.type.includes("no change"));
  const average = candidates.length ? candidates.reduce((s,a) => s+Math.abs(a.doi),0)/candidates.length : 0;
  const spikes = candidates.filter(a => Math.abs(a.doi) >= average*2);
  const topSpikes = spikes.sort((a,b) => Math.abs(b.doi)-Math.abs(a.doi)).slice(0,3);
  const clusters = [];
  const strikes = [...new Set(spikes.map(a => a.strike))].sort((a,b) => a-b);
  let cluster=[];
  for (const strike of strikes) {
    if (cluster.length && strike-cluster.at(-1)>pitch*2) { if(cluster.length>1) clusters.push(cluster); cluster=[]; }
    cluster.push(strike);
  }
  if(cluster.length>1) clusters.push(cluster);
  const priceBias = confirmedDirection({ candles: context.candles, now: context.now, spot });
  const confirmed = context.marketOpen === true && matchedSnapshots(context) && priceBias === activity.bias;
  const smartBias = confirmed && activity.bias === 1 ? "BULLISH" : confirmed && activity.bias === -1 ? "BEARISH" : "NEUTRAL";
  return { topSpikes, clusters, rolls: [], traps: [],
    highConvZones: [...new Set(spikes.filter(a=>a.highConv).map(a=>a.strike))],
    lowConvNoise: [...new Set(spikes.filter(a=>!a.highConv).map(a=>a.strike))],
    atmShift: activity.bias === 1 ? "PE Dominant" : activity.bias === -1 ? "CE Dominant" : "Balanced",
    signals: topSpikes.map(a=>({icon:"◈",label:a.side+" "+a.type+" at "+a.strike,strike:a.strike,conf:a.highConv?"MED":"LOW"})),
    top3Ce, top3Pe, concCe: totalCeOI>0 ? top3Ce.reduce((s,r)=>s+r.CE.openInterest,0)/totalCeOI*100 : 0,
    concPe: totalPeOI>0 ? top3Pe.reduce((s,r)=>s+r.PE.openInterest,0)/totalPeOI*100 : 0,
    totalCeOI, totalPeOI, smartBias, topRes, topSup, pcr, activity };
}

export function diffInstitutional(prevRows, rows, spot, context = {}) {
  const interval = { ...context, prevRows, mode:"intraday" };
  if (context.marketOpen !== true || !matchedSnapshots(interval)) return [];
  const elapsed = Math.round((marketTimestamp(context.timestamp)-marketTimestamp(context.prevTimestamp))/1000);
  const changes = rows.flatMap(r=>["CE","PE"].map(side=>({ row:r,side,...legActivity(r,side,interval) })))
    .filter(a=>a.oi != null && a.oi!==0 && a.type!=="No Change" && a.type!=="Unavailable");
  const alerts = changes.sort((a,b)=>Math.abs(b.oi)-Math.abs(a.oi)).slice(0,3).map(a=>({
    type:"ACTIVITY",strike:a.row.strikePrice,side:a.side,severity:"NEW",highConv:a.volume>0,
    label:a.side+" inferred "+a.type.toLowerCase()+" at "+a.row.strikePrice+" over "+elapsed+"s",
    detail:"OI "+(a.oi>0?"+":"")+fmtN(a.oi)+" · Premium "+(a.price>0?"+":"")+a.price.toFixed(2)+" · Interval volume "+fmtN(a.volume) }));
  for(const side of ["CE","PE"]) {
    const filter=r=>side==="CE"?r.strikePrice>spot:r.strikePrice<spot;
    const top=rs=>rs.filter(filter).filter(r=>r[side]?.openInterest>0).sort((a,b)=>b[side].openInterest-a[side].openInterest)[0];
    const old=top(prevRows), current=top(rows);
    if(old&&current&&old.strikePrice!==current.strikePrice) alerts.push({type:"WALL_SHIFT",strike:current.strikePrice,side,severity:"FLIP",highConv:false,
      label:side+" OI concentration moved "+old.strikePrice+" → "+current.strikePrice,
      detail:"Observed over "+elapsed+"s; migration alone does not confirm a breakout."});
  }
  return alerts;
}
