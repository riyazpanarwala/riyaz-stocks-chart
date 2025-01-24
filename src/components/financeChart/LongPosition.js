import React, { useState } from "react";
import { InteractiveYCoordinate } from "@riyazpanarwala/interactive";

const alert = {
  ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
  text: "Target",
  strokeWidth: 3,
  stroke: "rgba(116, 226, 68, 1)",
  textBox: {
    height: 24,
    left: 20,
    padding: { left: 10, right: 5 },
    closeIcon: {
      padding: { left: 0, right: 0 },
      width: 15,
      strokeWidth: 2,
    },
  },
};
const alert1 = {
  ...alert,
  textFill: "#000",
  edge: {
    ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
    stroke: "#fff",
    fill: "grey",
  },
};
const sell = {
  ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
  stroke: "rgba(232, 121, 117, 1)",
  textFill: "#E3342F",
  text: "Sell",
  strokeWidth: 3,
  edge: {
    ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
    stroke: "#E3342F",
  },
};
const sell1 = {
  ...sell,
  textFill: "#000",
  edge: {
    ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
    stroke: "#000",
    fill: "grey",
  },
};
const buy = {
  ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate,
  stroke: "rgba(151, 151, 151, 1)",
  textFill: "#1F9D55",
  text: "Buy",
  strokeWidth: 3,
  edge: {
    ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
    stroke: "#1F9D55",
  },
};
const buy1 = {
  ...buy,
  textFill: "#000",
  edge: {
    ...InteractiveYCoordinate.defaultProps.defaultPriceCoordinate.edge,
    stroke: "#000",
    fill: "grey",
  },
};

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
  // const [enableInteractiveObject, setEnableInteractiveObject] = useState(false)
  // const [alertToEdit, setAlertToEdit] = useState({})
  // const [modal, setShowModal] = useState(false)
  // const [originalAlertList, setOriginalAlertList] = useState([])

  React.useEffect(() => {
    const {
      currentVal,
      targetVal,
      stopLossVal,
      percent,
      isShortPosition,
    } = currentObj;

    let alertObj = alert1,
      buyObj = buy1,
      sellObj = sell1;
    if (!isPriceObj) {
      alertObj = alert;
      buyObj = buy;
      sellObj = sell;
    }

    setYCoordinateList([
      {
        ...alertObj,
        selected: true,
        stroke: isShortPosition
          ? "rgba(232, 121, 117, 1)"
          : "rgba(116, 226, 68, 1)",
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
        text: `Risk/Reward : 1`,
      },
      {
        ...sellObj,
        selected: true,
        stroke: isShortPosition
          ? "rgba(116, 226, 68, 1)"
          : "rgba(232, 121, 117, 1)",
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
    yCoordinateList.forEach((v) => {
      if (v.selected) {
        isSelected = true;
      }
    });
    onSelected(isSelected, priceObj.id);
    setPriceObj((obj) => ({
      ...obj,
      selected: isSelected,
    }));
  }, [yCoordinateList]);

  const onDelete = (e, yCoordinate, moreProps) => {
    e.preventDefault();
    e.stopPropagation();
    setYCoordinateList([]);
    // setOriginalAlertList([])
    if (onDeleteMain) {
      onDeleteMain(priceObj.id);
    }
  };

  const getCoordinates = (coordinates) => {
    const { isShortPosition } = currentObj;
    const targetVal = coordinates[0].yValue - coordinates[1].yValue;
    const stopLossVal = coordinates[1].yValue - coordinates[2].yValue;
    coordinates[0].text = `${
      isShortPosition ? "Stop" : "Target"
    }: ${round2Decimal(targetVal)} (${round2Decimal(
      (targetVal * 100) / coordinates[1].yValue
    )}%)`;
    coordinates[1].text = `Risk/Reward : ${
      isShortPosition
        ? round2Decimal(stopLossVal / targetVal)
        : round2Decimal(targetVal / stopLossVal)
    }`;
    coordinates[2].text = `${
      isShortPosition ? "Target" : "Stop"
    }: ${round2Decimal(stopLossVal)} (${round2Decimal(
      (stopLossVal * 100) / coordinates[1].yValue
    )}%)`;
    return coordinates;
  };

  const onDragComplete = (e, yCoordinateList1, moreProps, draggedAlert) => {
    // const { id: chartId } = moreProps.chartConfig;
    // const alertDragged = draggedAlert != null;
    const positionId = draggedAlert.id;

    const { yValue } = draggedAlert;

    if (positionId === 10) {
      if (!(yValue < yCoordinateList[1].yValue)) {
        // setEnableInteractiveObject(false)
        // setOriginalAlertList(yCoordinateList)
        setYCoordinateList(getCoordinates(yCoordinateList1));
        setPriceObj((obj) => ({
          ...obj,
          currentVal: yCoordinateList1[1].yValue,
          targetVal: yCoordinateList1[0].yValue,
          stopLossVal: yCoordinateList1[2].yValue,
        }));
      }
    } else if (positionId === 11) {
      if (
        !(
          yValue > yCoordinateList[0].yValue ||
          yValue < yCoordinateList[2].yValue
        )
      ) {
        // setEnableInteractiveObject(false)
        // setOriginalAlertList(yCoordinateList)
        setYCoordinateList(getCoordinates(yCoordinateList1));

        setPriceObj((obj) => ({
          ...obj,
          currentVal: yCoordinateList1[1].yValue,
          targetVal: yCoordinateList1[0].yValue,
          stopLossVal: yCoordinateList1[2].yValue,
        }));
      }
    } else if (positionId === 12) {
      if (!(yValue > yCoordinateList[1].yValue)) {
        // setEnableInteractiveObject(false)
        // setOriginalAlertList(yCoordinateList)
        setYCoordinateList(getCoordinates(yCoordinateList1));
        setPriceObj((obj) => ({
          ...obj,
          currentVal: yCoordinateList1[1].yValue,
          targetVal: yCoordinateList1[0].yValue,
          stopLossVal: yCoordinateList1[2].yValue,
        }));
      }
    }

    /*
    setEnableInteractiveObject(false)
    setOriginalAlertList(yCoordinateList)
    setYCoordinateList(yCoordinateList1)
    setAlertToEdit({
      alert: draggedAlert,
      chartId,
    })
    setShowModal(alertDragged)
    */
  };

  const round2Decimal = (value) => {
    return (Math.round(value * 100) / 100).toFixed(2);
  };

  const onDragCompleteHorizontal = (e, obj, moreProps) => {
    setPriceObj((obj1) => ({
      ...obj1,
      ...obj,
    }));
  };

  const onComplete = (e, obj, moreProps) => {
    const { x1Value, x2Value, currentVal, targetVal, stopLossVal } = obj;

    // const newCordinates = [...yCoordinateList];
    yCoordinateList[0].yValue = targetVal;
    yCoordinateList[1].yValue = currentVal;
    yCoordinateList[2].yValue = stopLossVal;

    setYCoordinateList(getCoordinates(yCoordinateList));
    setPriceObj((obj1) => ({
      ...obj1,
      x1Value: x1Value,
      x2Value: x2Value,
      currentVal: currentVal,
      targetVal: targetVal,
      stopLossVal: stopLossVal,
    }));
  };

  const onRiskRewardClick = (mainId, id) => {
    setYCoordinateList((prevState) =>
      prevState.map((v) => {
        if (v.id === id && priceObj.id === mainId) {
          return { ...v, selected: true };
        }
        return v;
      })
    );
  };

  const onOutsideClick = (mainId, id) => {
    setYCoordinateList((prevState) =>
      prevState.map((v) => {
        if (v.id === id && priceObj.id === mainId) {
          return { ...v, selected: false };
        }
        return v;
      })
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
      onChoosePosition={() => {}}
      priceObj={isPriceObj ? priceObj : ""}
      fillStyleGain="rgba(116, 226, 68, 0.3)"
      fillStyleLoss="rgba(232, 121, 117, 0.3)"
      onComplete={onComplete}
      onDragCompleteWhole={() => {}}
      isShortPosition={priceObj.isShortPosition}
      onRiskRewardClick={onRiskRewardClick}
      onOutsideClick={onOutsideClick}
      isShowOnSelect={true}
      isShwCloseIcon={true}
    />
  );
};

export default LongPosition;
