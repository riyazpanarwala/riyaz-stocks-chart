export function detectPatterns(data, windowSize = 1) {
    const swingHighs = [];
    const swingLows = [];

    if (!data || data.length < windowSize * 2 + 1) {
        return { swingHighs, swingLows };
    }

    for (let i = windowSize; i < data.length - windowSize; i++) {
        const curr = data[i];
        let isSwingHigh = true;
        let isSwingLow = true;

        // Check ALL periods in the window
        for (let j = 1; j <= windowSize; j++) {
            const prev = data[i - j];
            const next = data[i + j];

            // For swing high, current must be higher than ALL in window
            if (curr.high <= prev.high) isSwingHigh = false;
            if (curr.high <= next.high) isSwingHigh = false;

            // For swing low, current must be lower than ALL in window
            if (curr.low >= prev.low) isSwingLow = false;
            if (curr.low >= next.low) isSwingLow = false;
        }

        if (isSwingHigh) {
            const pattern = swingHighs.length > 0 ?
                (curr.high > swingHighs[swingHighs.length - 1].price ? "HH" : "LH") : "First";

            swingHighs.push({
                index: i,
                date: curr.date,
                price: curr.high,
                pattern
            });
        }

        if (isSwingLow) {
            const pattern = swingLows.length > 0 ?
                (curr.low > swingLows[swingLows.length - 1].price ? "HL" : "LL") : "First";

            swingLows.push({
                index: i,
                date: curr.date,
                price: curr.low,
                pattern
            });
        }
    }

    return { swingHighs, swingLows };
}

// Add these helper functions for better debugging
export function validateTrendlines(analysis) {
    const warnings = [];

    if (analysis.trendlines.supportLine) {
        const sl = analysis.trendlines.supportLine;
        if (sl.type === 'HL' && sl.slope < 0) {
            warnings.push('INVALID: Support line (HL) has negative slope');
        }
    }

    if (analysis.trendlines.resistanceLine) {
        const rl = analysis.trendlines.resistanceLine;
        if (rl.type === 'LH' && rl.slope > 0) {
            warnings.push('INVALID: Resistance line (LH) has positive slope');
        }
    }

    return warnings;
}

// Function to get recent market structure summary
export function getMarketSummary(analysis) {
    const summary = {
        marketState: analysis.marketState,
        swingCount: {
            highs: analysis.patterns.swingHighs.length,
            lows: analysis.patterns.swingLows.length
        },
        recentPattern: {
            lastHigh: analysis.patterns.swingHighs.slice(-1)[0]?.pattern,
            lastLow: analysis.patterns.swingLows.slice(-1)[0]?.pattern
        },
        breakouts: analysis.breakouts
    };

    return summary;
}

export function getTrendlinePoints(swings, type, lookback = 2) {
    if (!swings) return null;

    const filtered = swings.filter(s => s.pattern === type);
    if (filtered.length < 2) return null;

    const windowSize = Math.max(2, lookback);
    const points = filtered.slice(-windowSize);
    const p1 = points[0];
    const p2 = points[points.length - 1];

    return {
        p1,
        p2,
        type,
        slope: (p2.price - p1.price) / (p2.index - p1.index),
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
    if (!Array.isArray(data) || data.length === 0) {
        return {
            patterns: { swingHighs: [], swingLows: [] },
            trendlines: { supportLine: null, resistanceLine: null },
            breakouts: { trendline: null, structure: null },
            marketState: "InsufficientData",
        };
    }

    const dataWithIndex = data.map((bar, index) => ({ ...bar, index }));
    const patterns = detectPatterns(dataWithIndex, windowSize);
    const latest = dataWithIndex[dataWithIndex.length - 1];

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
