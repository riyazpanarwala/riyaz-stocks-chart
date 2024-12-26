import axios from "axios";

const baseurl = "https://api.upstox.com/v2/";

export const getHistoricData = (cb, interval, companyName, isBSE, isFrom) => {
  const headers = {
    Accept: "application/json",
  };
  const instrumentKey = `${isBSE ? "BSE_EQ|" : "NSE_EQ|"}${companyName}`;
  let currentDate = new Date();
  let toDate = currentDate.toISOString().split("T")[0];
  let fromDate = "";
  if (isFrom === "1m") {
    fromDate = new Date(currentDate.setDate(currentDate.getDate() - 30));
  } else if (isFrom === "3m") {
    fromDate = new Date(currentDate.setDate(currentDate.getDate() - 30 * 3));
  } else if (isFrom === "6m") {
    fromDate = new Date(currentDate.setDate(currentDate.getDate() - 30 * 6));
  } else {
    fromDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  }
  fromDate = fromDate.toISOString().split("T")[0];
  const newUrl = `${baseurl}historical-candle/${instrumentKey}/${interval}/${toDate}/${fromDate}`;

  axios
    .get(newUrl, { headers })
    .then((response) => {
      // Do something with the response data (e.g., print it)
      cb(response.data);
    })
    .catch((error) => {
      // Print an error message if the request was not successful
      console.error(`Error: ${error.response.status} - ${error.response.data}`);
    });
};

export const getIntradayData = (cb, interval, companyName, isBSE) => {
  const headers = {
    Accept: "application/json",
  };

  const instrumentKey = `${isBSE ? "BSE_EQ|" : "NSE_EQ|"}${companyName}`;
  const newUrl = `${baseurl}historical-candle/intraday/${instrumentKey}/${interval}`;

  axios
    .get(newUrl, { headers })
    .then((response) => {
      // Do something with the response data (e.g., print it)
      cb(response.data);
    })
    .catch((error) => {
      // Print an error message if the request was not successful
      console.error(`Error: ${error.response.status} - ${error.response.data}`);
    });
};
