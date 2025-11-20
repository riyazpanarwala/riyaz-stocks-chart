export function detectPatterns(data, windowSize = 1) {
    const swingHighs = [];
    const swingLows = [];

    // Input validation
    if (!data || data.length < windowSize * 2 + 1) {
        return { swingHighs, swingLows };
    }

    for (let i = windowSize; i < data.length - windowSize; i++) {
        const curr = data[i];
        let isSwingHigh = true;
        let isSwingLow = true;

        // Check surrounding window for swing points
        for (let j = 1; j <= windowSize; j++) {
            const prev = data[i - j];
            const next = data[i + j];

            if (curr.high <= prev.high || curr.high <= next.high) {
                isSwingHigh = false;
            }
            if (curr.low >= prev.low || curr.low >= next.low) {
                isSwingLow = false;
            }

            // Early exit if both conditions fail
            if (!isSwingHigh && !isSwingLow) break;
        }

        if (isSwingHigh) {
            swingHighs.push({
                index: i,
                date: curr.date,
                price: curr.high,
                pattern: swingHighs.length > 0 ?
                    (curr.high > swingHighs[swingHighs.length - 1].price ? "HH" : "LH") : "First"
            });
        }

        if (isSwingLow) {
            swingLows.push({
                index: i,
                date: curr.date,
                price: curr.low,
                pattern: swingLows.length > 0 ?
                    (curr.low > swingLows[swingLows.length - 1].price ? "HL" : "LL") : "First"
            });
        }
    }

    return { swingHighs, swingLows };
}

export function getTrendlinePoints(swings, type, lookback = 2) {
    if (!swings || swings.length < lookback) return null;

    const filtered = swings.filter(s => s.pattern === type);
    if (filtered.length < lookback) return null;

    const points = filtered.slice(-lookback);

    return {
        p1: points[0],
        p2: points[1],
        type,
        slope: (points[1].price - points[0].price) / (points[1].index - points[0].index)
    };
}

export function detectTrendlineBreakout(latest, trendline, confirmation = 0) {
    if (!trendline || !latest) return null;

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
    if (!swingHighs.length || !swingLows.length || !latest) return null;

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

// New function for comprehensive analysis
export function analyzeMarketStructure(data, windowSize = 2, confirmation = 0.1) {
    const patterns = detectPatterns(data, windowSize);
    const latest = data[data.length - 1];

    const supportLine = getTrendlinePoints(patterns.swingLows, "HL");
    const resistanceLine = getTrendlinePoints(patterns.swingHighs, "LH");

    const trendlineBreakout =
        detectTrendlineBreakout(latest, supportLine, confirmation) ||
        detectTrendlineBreakout(latest, resistanceLine, confirmation);

    const structureBreakout = detectStructureBreakout(
        patterns.swingHighs,
        patterns.swingLows,
        latest,
        confirmation
    );

    return {
        patterns,
        trendlines: { supportLine, resistanceLine },
        breakouts: {
            trendline: trendlineBreakout,
            structure: structureBreakout
        },
        marketState: getMarketState(patterns)
    };
}

// Helper function to determine market state
function getMarketState(patterns) {
    const recentHighs = patterns.swingHighs.slice(-3);
    const recentLows = patterns.swingLows.slice(-3);

    const higherHighs = recentHighs.every((high, i) =>
        i === 0 || high.pattern === "HH"
    );
    const higherLows = recentLows.every((low, i) =>
        i === 0 || low.pattern === "HL"
    );
    const lowerHighs = recentHighs.every((high, i) =>
        i === 0 || high.pattern === "LH"
    );
    const lowerLows = recentLows.every((low, i) =>
        i === 0 || low.pattern === "LL"
    );

    if (higherHighs && higherLows) return "Uptrend";
    if (lowerHighs && lowerLows) return "Downtrend";
    if (!higherHighs && !lowerLows) return "Consolidation";

    return "Transitioning";
}
