import React, { Fragment } from "react";
import { LineSeries } from "@riyazpanarwala/series";
import { CurrentCoordinate } from "@riyazpanarwala/coordinates";
import CustomTooltip from "./CustomTooltip";

const EMAChart = ({ emaArr, angles, isIntraday }) => {
  return (
    <>
      {emaArr.map((v, i) => {
        const { val } = v;
        const yVal = (isIntraday ? 48 : 32) + i * 16;
        return (
          <Fragment key={v.id}>
            <LineSeries yAccessor={val.accessor()} strokeStyle={val.stroke()} />
            <CurrentCoordinate
              yAccessor={val.accessor()}
              fillStyle={val.stroke()}
            />
            <CustomTooltip
              origin={[8, yVal]}
              yAccessor={val.accessor()}
              tooltipName={`EMA(${val.options().windowSize})`}
              textFill={val.stroke()}
            />
          </Fragment>
        );
      })}

      {angles ? (
        <CustomTooltip
          origin={[8, (isIntraday ? 48 : 32) + emaArr.length * 16]}
          yAccessor={(d) => angles[d.idx.index]}
          tooltipName={`Angle`}
          textFill={emaArr[0].val.stroke()}
        />
      ) : (
        ""
      )}
    </>
  );
};

export default EMAChart;
