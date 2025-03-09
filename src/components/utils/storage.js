const storageKey = "watchListArr";

export const setToStorage = (companyObj) => {
  let watchListArr = getStorageData();

  const index = watchListArr.findIndex((v) => v.value === companyObj.value);
  if (index === -1) {
    watchListArr = [...watchListArr, companyObj];
  }

  localStorage.setItem(storageKey, JSON.stringify(watchListArr));
};

export const updateStorageData = (companyObj) => {
  let watchListArr = getStorageData();

  const newArr = watchListArr.filter((v) => v.value !== companyObj.value);
  localStorage.setItem(storageKey, JSON.stringify(newArr));
};

export const getStorageData = () => {
  const storedData = localStorage.getItem(storageKey);
  if (storedData) {
    return JSON.parse(storedData);
  }
  return [];
};

export const isCompanyExistInStorage = (companyObj) => {
  const watchListArr = getStorageData();

  const index = watchListArr.findIndex((v) => v.value === companyObj.value);

  return index !== -1;
};
