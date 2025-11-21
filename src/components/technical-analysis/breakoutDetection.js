export function detectTrendlineBreakout(latest, trendline, confirmation = 0) {
    if (!trendline || !latest || latest.close === undefined) return null;

    const { p1, p2, type, slope } = trendline;

    // Calculate expected price at latest index
    const expected = slope * (latest.index - p1.index) + p1.price;

    // Add confirmation threshold (percentage)
    const threshold = expected * (confirmation / 100);

    switch (type) {
        case "HL": // Support line
            if (latest.close < (expected - threshold)) {
                return {
                    type: "Bearish Trendline Breakout",
                    breakPrice: expected,
                    actualPrice: latest.close,
                    strength: Math.abs((latest.close - expected) / expected) * 100
                };
            }
            break;

        case "LH": // Resistance line
            if (latest.close > (expected + threshold)) {
                return {
                    type: "Bullish Trendline Breakout",
                    breakPrice: expected,
                    actualPrice: latest.close,
                    strength: Math.abs((latest.close - expected) / expected) * 100
                };
            }
            break;
    }

    return null;
}

export function detectStructureBreakout(swingHighs, swingLows, latest, confirmation = 0) {
    if (!swingHighs.length || !swingLows.length || !latest || latest.close === undefined) return null;

    const lastHigh = swingHighs[swingHighs.length - 1];
    const lastLow = swingLows[swingLows.length - 1];

    const highThreshold = lastHigh.price * (1 + confirmation / 100);
    const lowThreshold = lastLow.price * (1 - confirmation / 100);

    if (latest.close > highThreshold) {
        return {
            type: "Break Above Last HH",
            level: lastHigh.price,
            breakPrice: latest.close,
            strength: ((latest.close - lastHigh.price) / lastHigh.price) * 100
        };
    }

    if (latest.close < lowThreshold) {
        return {
            type: "Break Below Last LL",
            level: lastLow.price,
            breakPrice: latest.close,
            strength: ((lastLow.price - latest.close) / lastLow.price) * 100
        };
    }

    return null;
}
