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

export function getPatternHistory(patterns, count = 10) {
    return {
        highs: patterns.swingHighs.slice(-count).map(h => ({
            price: h.price,
            pattern: h.pattern,
            date: h.date
        })),
        lows: patterns.swingLows.slice(-count).map(l => ({
            price: l.price,
            pattern: l.pattern,
            date: l.date
        }))
    };
}

export function getAdvancedMarketState(analysis) {
    const basicState = analysis.marketState;
    let strength = 'NEUTRAL';

    if (analysis.breakouts.trendline || analysis.breakouts.structure) {
        const breakoutStrength = Math.max(
            analysis.breakouts.trendline?.strength || 0,
            analysis.breakouts.structure?.strength || 0
        );

        if (breakoutStrength > 3) strength = 'VERY_STRONG';
        else if (breakoutStrength > 1.5) strength = 'STRONG';
        else strength = 'WEAK';
    }

    return {
        state: basicState,
        strength,
        confidence: analysis.patterns.swingHighs.length > 5 && analysis.patterns.swingLows.length > 5 ? 'HIGH' : 'LOW'
    };
}
