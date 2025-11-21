import { detectPatterns } from './patternDetection.js';
import { getTrendlinePoints, validateTrendlines } from './trendlineAnalysis.js';
import { detectTrendlineBreakout, detectStructureBreakout } from './breakoutDetection.js';

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

function getMarketState(patterns) {
    const recentHighs = patterns.swingHighs.slice(-3);
    const recentLows = patterns.swingLows.slice(-3);

    // Need at least 2 swings of each type to determine a trend
    if (recentHighs.length < 2 || recentLows.length < 2) {
        return "InsufficientData";
    }

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
