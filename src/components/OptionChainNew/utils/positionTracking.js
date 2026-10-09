import { buildPositionPlan } from "./tradeRules.js";

// Freeze the offered contract and underlying reference until recorded or cleared.
// Later live signals must not reinterpret a broker fill already being entered.
export function pendingFillReducer(pending, action) {
  if (action.type === "clear") return null;
  if (action.type !== "offer" || pending) return pending;
  const { contract, tradePlan, rawSignal } = action.signal ?? {};
  const side = rawSignal === "BUY CALL" ? "CE" : rawSignal === "BUY PUT" ? "PE" : null;
  if (!contract || !tradePlan || !side || contract.side !== side || tradePlan.side !== side ||
      contract.expiry !== action.expiry || !(contract.strike > 0)) return pending;
  return { contract: { ...contract }, tradePlan: { ...tradePlan }, capturedAt: action.now };
}

export function recordPendingFill(pending, { entryPrice, roundTripCost, openedAt }) {
  if (!pending) return null;
  const { contract, tradePlan } = pending;
  const plan = buildPositionPlan({ ...tradePlan, entryPrice, roundTripCost, spot: tradePlan.entrySpot });
  return plan ? { ...plan, strike: contract.strike, expiry: contract.expiry, openedAt } : null;
}
