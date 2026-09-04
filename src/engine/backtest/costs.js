export function calculateTransactionCosts({ side, price, quantity }, config) {
  if (!['BUY', 'SELL'].includes(side)) throw new Error("side must be BUY or SELL");
  const turnover = price * quantity;
  const brokerageRaw = turnover * config.brokerageRate;
  const brokerage = config.brokerageMaxPerOrder > 0 ? Math.min(brokerageRaw, config.brokerageMaxPerOrder) : brokerageRaw;
  const stt = turnover * (side === 'BUY' ? config.sttBuyRate : config.sttSellRate);
  const exchangeCharges = turnover * config.exchangeRate;
  const sebiCharges = turnover * config.sebiRate;
  const gst = (brokerage + exchangeCharges + sebiCharges) * config.gstRate;
  const stampDuty = side === 'BUY' ? turnover * config.stampDutyBuyRate : 0;
  const fixed = config.fixedPerOrder;
  const total = brokerage + stt + exchangeCharges + sebiCharges + gst + stampDuty + fixed;
  return { turnover, brokerage, stt, exchangeCharges, sebiCharges, gst, stampDuty, fixed, total };
}

export function applySlippage(price, side, slippageBps) {
  const factor = slippageBps / 10_000;
  return side === 'BUY' ? price * (1 + factor) : price * (1 - factor);
}
