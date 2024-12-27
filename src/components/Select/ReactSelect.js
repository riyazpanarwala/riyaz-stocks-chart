import React from "react";
import Select from "react-select";
import MenuList from "./MenuList";
import Option from "./Option";

import "./ReactSelect.scss";

const ReactSelect = ({ options, value, onChange, placeholder }) => {
  const customStyles = {
    menu: (provided) => ({
      ...provided,
      zIndex: 100,
      padding: "10px 0",
    }),
    control: (provided) => ({
      ...provided,
      width: "350px",
    }),
  };

  return (
    <Select
      options={options}
      value={value && [value]}
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
