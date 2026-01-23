function calculateATR(candles, period = 22) {
    const atr = [];
    let trSum = 0;

    for (let i = 0; i < candles.length; i++) {
        if (i === 0) {
            atr.push(null);
            continue;
        }

        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i - 1].close;

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );

        if (i < period) {
            trSum += tr;
            atr.push(null);
        } else if (i === period) {
            trSum += tr;
            atr.push(trSum / period);
        } else {
            const prevATR = atr[i - 1];
            atr.push(((prevATR * (period - 1)) + tr) / period);
        }
    }

    return atr;
}

function calculateChandelierExit(
    candles,
    period = 22,
    multiplier = 3
) {
    const atr = calculateATR(candles, period);

    const result = [];
    let trend = "long";
    let ceLong = null;
    let ceShort = null;

    for (let i = 0; i < candles.length; i++) {
        if (i < period || atr[i] === null) {
            result.push({ ...candles[i], ce: null, signal: null, trend });
            continue;
        }

        // Highest High / Lowest Low
        const slice = candles.slice(i - period + 1, i + 1);
        const highestHigh = Math.max(...slice.map(c => c.high));
        const lowestLow = Math.min(...slice.map(c => c.low));

        const longCE = highestHigh - atr[i] * multiplier;
        const shortCE = lowestLow + atr[i] * multiplier;

        let signal = null;

        if (trend === "long") {
            ceLong = ceLong === null ? longCE : Math.max(ceLong, longCE);

            if (candles[i].close < ceLong) {
                trend = "short";
                ceShort = shortCE;
                signal = "SELL";
            }
        } else {
            ceShort = ceShort === null ? shortCE : Math.min(ceShort, shortCE);

            if (candles[i].close > ceShort) {
                trend = "long";
                ceLong = longCE;
                signal = "BUY";
            }
        }

        result.push({
            ...candles[i],
            ce: trend === "long" ? ceLong : ceShort,
            trend,
            signal
        });
    }

    return result;
}

export { calculateChandelierExit };

