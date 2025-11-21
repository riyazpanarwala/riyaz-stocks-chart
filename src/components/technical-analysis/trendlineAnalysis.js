export function getTrendlinePoints(swings, type, lookback = 2) {
    if (!swings) return null;

    const filtered = swings.filter(s => s.pattern === type);
    if (filtered.length < 2) return null;

    const windowSize = Math.max(2, lookback);
    const points = filtered.slice(-windowSize);
    const p1 = points[0];
    const p2 = points[points.length - 1];

    if (p2.index === p1.index) return null;

    return {
        p1,
        p2,
        type,
        slope: (p2.price - p1.price) / (p2.index - p1.index),
    };
}

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
