const storageKey = "watchListArr";

const notifyStorageChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("watchlist-updated"));
  }
};

export const getStorageData = () => {
  if (typeof window !== "undefined") {
    try {
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (err) {
      console.error("Failed to read watchlist from localStorage:", err);
    }
  }
  return [];
};

export const setToStorage = (companyObj) => {
  if (!companyObj?.value) return;
  let watchListArr = getStorageData();

  const index = watchListArr.findIndex((v) => v.value === companyObj.value);
  if (index === -1) {
    watchListArr = [...watchListArr, companyObj];
  }

  localStorage.setItem(storageKey, JSON.stringify(watchListArr));
  notifyStorageChange();
};

export const updateStorageData = (companyObj) => {
  if (!companyObj?.value) return;
  let watchListArr = getStorageData();

  const newArr = watchListArr.filter((v) => v.value !== companyObj.value);
  localStorage.setItem(storageKey, JSON.stringify(newArr));
  notifyStorageChange();
};

export const isCompanyExistInStorage = (companyObj) => {
  if (!companyObj?.value) return false;
  const watchListArr = getStorageData();
  return watchListArr.some((v) => v.value === companyObj.value);
};
