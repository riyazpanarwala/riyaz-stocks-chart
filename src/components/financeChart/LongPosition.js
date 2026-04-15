import React, { useState } from "react";
import { InteractiveYCoordinate } from "@riyazpanarwala/interactive";
import { useThemeColors } from "./useThemeColors";

/* ── Base coordinate style builders ── */

const makeAlert = (isPriceObj, DARK) => ({
  ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
  text: "Target",
  strokeWidth: 3,
  stroke: DARK.posTarget,
  textBox: {
    height: 24,
    left: 20,
    padding: { left: 10, right: 5 },
    closeIcon: { padding: { left: 0, right: 0 }, width: 15, strokeWidth: 2 },
  },
  ...(isPriceObj && {
    textFill: DARK.tx_primary,
    edge: {
      ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
      stroke: DARK.posEdgeStroke,
      fill: DARK.posEdgeFill,
    },
  }),
});

const makeSell = (isPriceObj, DARK) => ({
  ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
  stroke: DARK.posStop,
  textFill: isPriceObj ? DARK.tx_primary : DARK.posTextLoss,
  text: "Sell",
  strokeWidth: 3,
  edge: {
    ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
    stroke: isPriceObj ? DARK.posEdgeStroke : DARK.posStop,
    fill: isPriceObj ? DARK.posEdgeFill : undefined,
  },
});

const makeBuy = (isPriceObj, DARK) => ({
  ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
  stroke: DARK.posEntry,
  textFill: isPriceObj ? DARK.tx_primary : DARK.posTextGain,
  text: "Buy",
  strokeWidth: 3,
  edge: {
    ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
    stroke: isPriceObj ? DARK.posEdgeStroke : DARK.posTextGain,
    fill: isPriceObj ? DARK.posEdgeFill : undefined,
  },
});

const LongPosition = ({
  saveInteractiveNode,
  currentObj,
  isPriceObj,
  onDeleteMain,
  isEnabled,
  onSelected,
}) => {
  const [yCoordinateList, setYCoordinateList] = useState([]);
  const [priceObj, setPriceObj] = useState({});
  const DARK = useThemeColors();

  React.useEffect(() => {
    const { currentVal, targetVal, stopLossVal, percent, isShortPosition } = currentObj;

    const alertObj = makeAlert(isPriceObj, DARK);
    const buyObj = makeBuy(isPriceObj, DARK);
    const sellObj = makeSell(isPriceObj, DARK);

    setYCoordinateList([
      {
        ...alertObj,
        selected: true,
        stroke: isShortPosition ? DARK.posStop : DARK.posTarget,
        yValue: round2Decimal(targetVal),
        id: 10,
        draggable: true,
        text: `${isShortPosition ? "Stop" : "Target"}: ${round2Decimal(
          targetVal - currentVal
        )} (${percent}%)`,
      },
      {
        ...buyObj,
        selected: true,
        yValue: round2Decimal(currentVal),
        id: 11,
        draggable: true,
        text: "Risk/Reward : 1",
      },
      {
        ...sellObj,
        selected: true,
        stroke: isShortPosition ? DARK.posTarget : DARK.posStop,
        yValue: round2Decimal(stopLossVal),
        id: 12,
        draggable: true,
        text: `${isShortPosition ? "Target" : "Stop"}: ${round2Decimal(
          currentVal - stopLossVal
        )} (${percent}%)`,
      },
    ]);
    setPriceObj(currentObj);
  }, []);

  React.useEffect(() => {
    let isSelected = false;
    yCoordinateList.forEach((v) => { if (v.selected) isSelected = true; });
    onSelected(isSelected, priceObj.id);
    setPriceObj((obj) => ({ ...obj, selected: isSelected }));
  }, [yCoordinateList]);

  const onDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setYCoordinateList([]);
    if (onDeleteMain) onDeleteMain(priceObj.id);
  };

  const getCoordinates = (coordinates) => {
    const { isShortPosition } = currentObj;
    const targetVal = coordinates[0].yValue - coordinates[1].yValue;
    const stopLossVal = coordinates[1].yValue - coordinates[2].yValue;
    const entryVal = coordinates[1].yValue;
    const percent = (delta) => (entryVal === 0 ? "0.00" : round2Decimal((delta * 100) / entryVal));
    const ratio = (num, den) => (den === 0 ? "0.00" : round2Decimal(num / den));

    coordinates[0].text = `${isShortPosition ? "Stop" : "Target"}: ${round2Decimal(targetVal)} (${percent(targetVal)}%)`;
    coordinates[1].text = `Risk/Reward : ${isShortPosition ? ratio(stopLossVal, targetVal) : ratio(targetVal, stopLossVal)}`;
    coordinates[2].text = `${isShortPosition ? "Target" : "Stop"}: ${round2Decimal(stopLossVal)} (${percent(stopLossVal)}%)`;
    return coordinates;
  };

  const onDragComplete = (e, yCoordinateList1, moreProps, draggedAlert) => {
    const positionId = draggedAlert.id;
    const { yValue } = draggedAlert;

    if (positionId === 10) {
      if (!(yValue < yCoordinateList[1].yValue)) {
        setYCoordinateList(getCoordinates(yCoordinateList1));
        setPriceObj((obj) => ({ ...obj, currentVal: yCoordinateList1[1].yValue, targetVal: yCoordinateList1[0].yValue, stopLossVal: yCoordinateList1[2].yValue }));
      }
    } else if (positionId === 11) {
      if (!(yValue > yCoordinateList[0].yValue || yValue < yCoordinateList[2].yValue)) {
        setYCoordinateList(getCoordinates(yCoordinateList1));
        setPriceObj((obj) => ({ ...obj, currentVal: yCoordinateList1[1].yValue, targetVal: yCoordinateList1[0].yValue, stopLossVal: yCoordinateList1[2].yValue }));
      }
    } else if (positionId === 12) {
      if (!(yValue > yCoordinateList[1].yValue)) {
        setYCoordinateList(getCoordinates(yCoordinateList1));
        setPriceObj((obj) => ({ ...obj, currentVal: yCoordinateList1[1].yValue, targetVal: yCoordinateList1[0].yValue, stopLossVal: yCoordinateList1[2].yValue }));
      }
    }
  };

  const round2Decimal = (value) => (Math.round(value * 100) / 100).toFixed(2);

  const onDragCompleteHorizontal = (e, obj) => {
    setPriceObj((obj1) => ({ ...obj1, ...obj }));
  };

  const onComplete = (e, obj) => {
    const { x1Value, x2Value, currentVal, targetVal, stopLossVal } = obj;
    const nextCoordinates = yCoordinateList.map((coordinate) => ({ ...coordinate }));
    nextCoordinates[0].yValue = targetVal;
    nextCoordinates[1].yValue = currentVal;
    nextCoordinates[2].yValue = stopLossVal;
    setYCoordinateList(getCoordinates(nextCoordinates));
    setPriceObj((obj1) => ({ ...obj1, x1Value, x2Value, currentVal, targetVal, stopLossVal }));
  };

  const onRiskRewardClick = (mainId, id) => {
    setYCoordinateList((prev) =>
      prev.map((v) => (v.id === id && priceObj.id === mainId ? { ...v, selected: true } : v))
    );
  };

  const onOutsideClick = (mainId, id) => {
    setYCoordinateList((prev) =>
      prev.map((v) => (v.id === id && priceObj.id === mainId ? { ...v, selected: false } : v))
    );
  };

  return (
    <InteractiveYCoordinate
      ref={saveInteractiveNode("InteractiveYCoordinate", 1)}
      enabled={isEnabled}
      onDragCompleteHorizontal={onDragCompleteHorizontal}
      onDragComplete={onDragComplete}
      onDelete={onDelete}
      yCoordinateList={yCoordinateList}
      onChoosePosition={() => { }}
      priceObj={isPriceObj ? priceObj : ""}
      fillStyleGain={DARK.posGain}
      fillStyleLoss={DARK.posLoss}
      onComplete={onComplete}
      onDragCompleteWhole={() => { }}
      isShortPosition={priceObj.isShortPosition}
      onRiskRewardClick={onRiskRewardClick}
      onOutsideClick={onOutsideClick}
      isShowOnSelect={true}
      isShwCloseIcon={true}
    />
  );
};

export default LongPosition;
