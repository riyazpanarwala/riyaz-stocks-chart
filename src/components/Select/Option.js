import React from "react";
import cx from "classnames";

const Option = ({ children, isSelected, innerProps, innerRef }) => (
  <div
    ref={innerRef}
    {...innerProps}
    className={cx("react-select__option", {
      "react-select__option_selected": isSelected,
    })}
  >
    {children}
  </div>
);

export default Option;
