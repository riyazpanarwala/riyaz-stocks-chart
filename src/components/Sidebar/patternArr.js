const patternArr = (patternName) => {
  return [
    {
      id: "multibagger",
      name: "MultiBagger",
      isActive: patternName === "multibagger",
    },
    {
      id: "marubozu",
      name: "Marubozu",
      isActive: patternName === "marubozu",
    },
    {
      id: "hammer",
      name: "Hammer",
      isActive: patternName === "hammer",
    },
    {
      id: "morningstar",
      name: "Morning Star",
      isActive: patternName === "morningstar",
      len: 3,
    },
    {
      id: "tweezerbottom",
      name: "Tweezer Bottom",
      isActive: patternName === "tweezerbottom",
      len: 5,
    },
    {
      id: "tweezertop",
      name: "Tweezer Top",
      isActive: patternName === "tweezertop",
      len: 5,
    },
    {
      id: "shootingstar",
      name: "Shooting Star",
      isActive: patternName === "shootingstar",
      len: 5,
    },
    {
      id: "hangingman",
      name: "Hanging man",
      isActive: patternName === "hangingman",
      len: 5,
    },
    {
      id: "threewhitesoldiers",
      name: "Three white soldiers",
      isActive: patternName === "threewhitesoldiers",
      len: 3,
    },
    {
      id: "threeblackcrows",
      name: "Three black crows",
      isActive: patternName === "threeblackcrows",
      len: 3,
    },
    {
      id: "morningdojistar",
      name: "Morning Doji Star",
      isActive: patternName === "morningdojistar",
      len: 3,
    },
    {
      id: "piercingline",
      name: "Piercing line",
      isActive: patternName === "piercingline",
      len: 2,
    },
    {
      id: "eveningstar",
      name: "Evening star",
      isActive: patternName === "eveningstar",
      len: 3,
    },
    {
      id: "eveningdojistar",
      name: "Evening Doji Star",
      isActive: patternName === "eveningdojistar",
      len: 3,
    },
    {
      id: "downsidetasukigap",
      name: "Downside tasukigap",
      isActive: patternName === "downsidetasukigap",
      len: 3,
    },
    {
      id: "bearishharamicross",
      name: "Bearish Haramicross",
      isActive: patternName === "bearishharamicross",
      len: 2,
    },
    {
      id: "bullishharamicross",
      name: "Bullish Haramicross",
      isActive: patternName === "bullishharamicross",
      len: 2,
    },
    {
      id: "bearishharami",
      name: "Bearish Harami",
      isActive: patternName === "bearishharami",
      len: 2,
    },
    {
      id: "bullishharami",
      name: "Bullish harami",
      isActive: patternName === "bullishharami",
      len: 2,
    },
    {
      id: "darkcloudcover",
      name: "darkcloudcover",
      isActive: patternName === "darkcloudcover",
      len: 2,
    },
    {
      id: "bullishengulfingpattern",
      name: "Bullish Engulfing Pattern",
      isActive: patternName === "bullishengulfingpattern",
      len: 2,
    },
    {
      id: "bearishengulfingpattern",
      name: "Bearish Engulfing Pattern",
      isActive: patternName === "bearishengulfingpattern",
      len: 2,
    },
    {
      id: "abandonedbaby",
      name: "Abandoned baby",
      isActive: patternName === "abandonedbaby",
      len: 3,
    },

    {
      id: "bearishmarubozu",
      name: "Bearish Marubozu",
      isActive: patternName === "bearishmarubozu",
      len: 1,
    },
    {
      id: "bullishmarubozu",
      name: "Bullish Marubozu",
      isActive: patternName === "bullishmarubozu",
      len: 1,
    },
    {
      id: "bullishhammerstick",
      name: "Bullish hammer",
      isActive: patternName === "bullishhammerstick",
      len: 1,
    },
    {
      id: "bullishinvertedhammerstick",
      name: "Bullish Invertedhammer",
      isActive: patternName === "bullishinvertedhammerstick",
      len: 1,
    },
    {
      id: "bearishhammerstick",
      name: "Bearish hammer",
      isActive: patternName === "bearishhammerstick",
      len: 1,
    },
    {
      id: "bearishinvertedhammerstick",
      name: "Bearish Invertedhammer",
      isActive: patternName === "bearishinvertedhammerstick",
      len: 1,
    },
    {
      id: "bearishspinningtop",
      name: "Bearish Spinningtop",
      isActive: patternName === "bearishspinningtop",
      len: 1,
    },
    {
      id: "bullishspinningtop",
      name: "Bullish Spinningtop",
      isActive: patternName === "bullishspinningtop",
      len: 1,
    },

    {
      id: "doji",
      name: "Doji",
      isActive: patternName === "doji",
      len: 1,
    },
    {
      id: "dragonflydoji",
      name: "Dragonfly Doji",
      isActive: patternName === "dragonflydoji",
      len: 1,
    },
    {
      id: "gravestonedoji",
      name: "Gravestone Doji",
      isActive: patternName === "gravestonedoji",
      len: 1,
    },
  ];
};

export default patternArr;
