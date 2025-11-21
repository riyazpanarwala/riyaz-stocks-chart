import { detectPatterns } from './patternDetection.js';
import { getTrendlinePoints, validateTrendlines } from './trendlineAnalysis.js';
import { detectTrendlineBreakout, detectStructureBreakout } from './breakoutDetection.js';
import { analyzeMarketStructure } from './marketAnalysis.js';
import { getMarketSummary, getPatternHistory } from './utils.js';

// Main analysis function
function quickAnalysis(data, windowSize = 2, confirmation = 0.5) {
    const analysis = analyzeMarketStructure(data, windowSize, confirmation);
    const summary = getMarketSummary(analysis);

    return {
        state: analysis.marketState,
        signals: summary.breakouts,
        swings: summary.swingCount,
        patternHistory: getPatternHistory(analysis.patterns, 5)
    };
}

// Default export for easy importing
export default {
    analyzeMarketStructure,
    quickAnalysis,
    detectPatterns,
    getTrendlinePoints,
    detectTrendlineBreakout,
    detectStructureBreakout,
    getMarketSummary
};
