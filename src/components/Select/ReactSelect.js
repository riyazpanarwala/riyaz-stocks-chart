import React, { useMemo } from "react";
import Select from "react-select";
import MenuList from "./MenuList";
import Option from "./Option";

import "./ReactSelect.scss";

const SELECT_COMPONENTS = {
  MenuList,
  Option,
};

const customFilter = (option, searchText) => {
  if (!searchText) return true;
  const query = searchText.toLowerCase();
  const label = option.data._lowerLabel || option.data.label?.toLowerCase() || "";
  const symbol = option.data._lowerSymbol || option.data.symbol?.toLowerCase() || "";
  return label.includes(query) || symbol.includes(query);
};

const ReactSelect = ({
  options,
  value,
  onChange,
  placeholder,
  width,
  minWidth,
}) => {
  const customStyles = useMemo(
    () => ({
      menu: (provided) => ({
        ...provided,
        zIndex: 100,
        padding: "10px 0",
      }),
      control: (provided) => ({
        ...provided,
        width: width,
        minWidth,
      }),
    }),
    [width, minWidth],
  );

  const selectedValue = useMemo(() => (value ? [value] : null), [value]);

  return (
    <Select
      options={options}
      value={selectedValue}
      filterOption={customFilter}
      onChange={onChange}
      classNamePrefix="react-select"
      placeholder={placeholder}
      components={SELECT_COMPONENTS}
      styles={customStyles}
      isSearchable={true}
    />
  );
};

export default ReactSelect;
