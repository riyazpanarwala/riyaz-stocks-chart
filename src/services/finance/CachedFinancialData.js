const financialDataCache = new Map();

export function getCachedData(symbol) {
  const entry = financialDataCache.get(symbol);
  if (!entry) return null;

  const now = Date.now();
  const { data, timestamp, ttl } = entry;

  if (now - timestamp < ttl) {
    return data;
  } else {
    financialDataCache.delete(symbol);
    return null;
  }
}

export function setCachedData(symbol, data, ttl = 1000 * 60 * 15) {
  financialDataCache.set(symbol, {
    data,
    timestamp: Date.now(),
    ttl,
  });

  if (financialDataCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of financialDataCache.entries()) {
      if (now - v.timestamp >= v.ttl) {
        financialDataCache.delete(k);
      }
    }
    // If still oversized, remove oldest entries
    if (financialDataCache.size > 1000) {
      const oldestKeys = [...financialDataCache.keys()].slice(0, 200);
      for (const k of oldestKeys) {
        financialDataCache.delete(k);
      }
    }
  }
}
