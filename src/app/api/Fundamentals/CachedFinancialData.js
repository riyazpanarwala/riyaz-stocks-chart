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
}
