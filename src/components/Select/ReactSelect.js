import React from "react";
import Select from "react-select";
import MenuList from "./MenuList";
import Option from "./Option";

import "./ReactSelect.scss";

const ReactSelect = ({
  options,
  value,
  onChange,
  placeholder,
  width,
  minWidth,
}) => {
  const customStyles = {
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
  };

  const customFilter = (option, searchText) => {
    if (
      option.data.label?.toLowerCase().includes(searchText.toLowerCase()) ||
      option.data.symbol?.toLowerCase().includes(searchText.toLowerCase())
    ) {
      return true;
    }
    return false;
  };

  return (
    <Select
      options={options}
      value={value && [value]}
      filterOption={customFilter}
      onChange={onChange}
      classNamePrefix="react-select"
      placeholder={placeholder}
      components={{
        MenuList,
        Option,
      }}
      styles={customStyles}
      isSearchable={true}
    />
  );
};

export default ReactSelect;
