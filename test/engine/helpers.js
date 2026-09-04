export function candles(count = 300, direction = 1) {
  const result = [];
  let previous = 100;
  for (let i = 0; i < count; i++) {
    const close = 100 + direction * i * 0.25 + Math.sin(i / 4) * 1.2;
    result.push({ timestamp: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(), open: previous, high: Math.max(previous, close) + 0.8, low: Math.min(previous, close) - 0.8, close, volume: 1000 + (i % 10) * 50, openInterest: null });
    previous = close;
  }
  return result;
}
