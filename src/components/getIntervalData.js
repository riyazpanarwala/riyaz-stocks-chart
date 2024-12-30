import axios from "axios";

const baseurl = "https://api.upstox.com/v2/";

export const getHistoricData = async (interval, companyName, isBSE, isFrom) => {
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

  try {
    const response = await axios.get(newUrl, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};

export const getIntradayData = async (interval, companyName, isBSE) => {
  const headers = {
    Accept: "application/json",
  };

  const instrumentKey = `${isBSE ? "BSE_EQ|" : "NSE_EQ|"}${companyName}`;
  const newUrl = `${baseurl}historical-candle/intraday/${instrumentKey}/${interval}`;

  try {
    const response = await axios.get(newUrl, { headers });
    return response.data;
  } catch (error) {
    // Print an error message if the request was not successful
    console.error(`Error: ${error.response.status} - ${error.response.data}`);
    return { error: true, data: { candles: [] } };
  }
};
