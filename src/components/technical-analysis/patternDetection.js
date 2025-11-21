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
