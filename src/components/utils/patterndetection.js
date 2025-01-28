const indicators = require("technicalindicators");

export const patterndetection = (dataArr, key) => {
  let patternArr = [];
  dataArr.forEach((v) => {
    const input = {
      close: [v.close],
      open: [v.open],
      high: [v.high],
      low: [v.low],
    };
    if (indicators[key](input)) {
      patternArr = [...patternArr, v];
    }
  });

  return patternArr;
};

export const patterndetectionWithLength = (dataArr, key, len) => {
  let patternArr = [];
  for (let i = 0; i < dataArr.length; i++) {
    if (i - len + 1 < 0) {
      // patternArr = [...patternArr, null];
    } else {
      let sliceArr = dataArr.slice(i - len + 1, i + 1);
      const input = {
        close: sliceArr.map((v) => v.close),
        open: sliceArr.map((v) => v.open),
        high: sliceArr.map((v) => v.high),
        low: sliceArr.map((v) => v.low),
      };
      if (indicators[key](input)) {
        patternArr = [...patternArr, dataArr[i]];
      }
    }
  }

  return patternArr;
};

export const tweezerbottomDetect = (arr) => {
  return patterndetectionWithLength(arr, "tweezerbottom", 5);
};

export const tweezertopDetect = (arr) => {
  return patterndetectionWithLength(arr, "tweezertop", 5);
};

export const shootingstarDetect = (arr) => {
  return patterndetectionWithLength(arr, "shootingstar", 5);
};

export const hangingmanDetect = (arr) => {
  return patterndetectionWithLength(arr, "hangingman", 5);
};

export const threewhitesoldiersDetect = (arr) => {
  return patterndetectionWithLength(arr, "threewhitesoldiers", 3);
};

export const threeblackcrowsDetect = (arr) => {
  return patterndetectionWithLength(arr, "threeblackcrows", 3);
};

export const morningdojistarDetect = (arr) => {
  return patterndetectionWithLength(arr, "morningdojistar", 3);
};

export const morningstarDetect = (arr) => {
  return patterndetectionWithLength(arr, "morningstar", 3);
};

export const piercinglineDetect = (arr) => {
  return patterndetectionWithLength(arr, "piercingline", 2);
};

export const bearishharamiDetect = (arr) => {
  return patterndetectionWithLength(arr, "bearishharami", 2);
};

export const eveningstarDetect = (arr) => {
  return patterndetectionWithLength(arr, "eveningstar", 3);
};

export const eveningdojistarDetect = (arr) => {
  return patterndetectionWithLength(arr, "eveningdojistar", 3);
};

export const downsidetasukigapDetect = (arr) => {
  return patterndetectionWithLength(arr, "downsidetasukigap", 3);
};

export const bearishharamicrossDetect = (arr) => {
  return patterndetectionWithLength(arr, "bearishharamicross", 2);
};

export const bullishharamicrossDetect = (arr) => {
  return patterndetectionWithLength(arr, "bullishharamicross", 2);
};

export const bullishharamiDetect = (arr) => {
  return patterndetectionWithLength(arr, "bullishharami", 2);
};

export const darkcloudcoverDetect = (arr) => {
  return patterndetectionWithLength(arr, "darkcloudcover", 2);
};

export const bullishengulfingpatternDetect = (arr) => {
  return patterndetectionWithLength(arr, "bullishengulfingpattern", 2);
};

export const bearishengulfingpatternDetect = (arr) => {
  return patterndetectionWithLength(arr, "bearishengulfingpattern", 2);
};

export const abandonedbabyDetect = (arr) => {
  return patterndetectionWithLength(arr, "abandonedbaby", 3);
};

export const bearishmarubozuDetect = (arr) => {
  return patterndetection(arr, "bearishmarubozu");
};

export const bullishmarubozuDetect = (arr) => {
  return patterndetection(arr, "bullishmarubozu");
};

export const bullishhammerDetect = (arr) => {
  return patterndetection(arr, "bullishhammerstick");
};

export const bullishinvertedhammerDetect = (arr) => {
  return patterndetection(arr, "bullishinvertedhammerstick");
};

export const bearishhammerDetect = (arr) => {
  return patterndetection(arr, "bearishhammerstick");
};

export const bearishinvertedhammerDetect = (arr) => {
  return patterndetection(arr, "bearishinvertedhammerstick");
};

export const bearishspinningtopDetect = (arr) => {
  return patterndetection(arr, "bearishspinningtop");
};

export const bullishspinningtopDetect = (arr) => {
  return patterndetection(arr, "bullishspinningtop");
};

export const dojiDetect = (arr) => {
  return patterndetection(arr, "doji");
};

export const dragonflydojiDetect = (arr) => {
  return patterndetection(arr, "dragonflydoji");
};

export const gravestonedojiDetect = (arr) => {
  return patterndetection(arr, "gravestonedoji");
};
