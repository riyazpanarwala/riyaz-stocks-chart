import { INDIAN_MARKET_SESSION } from "../../engine/config/marketSession.js";

// Function to check if the current time is between 9:15 AM and 3:30 PM IST
const isTradingActive = () => {
  // Get the current time in UTC
  const nowUTC = new Date();

  // Convert the current time to IST
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET);

  // Define the start and end times in IST
  const startTimeIST = new Date(nowIST);
  const [startHour, startMinute] = INDIAN_MARKET_SESSION.start.split(":").map(Number);
  startTimeIST.setHours(startHour, startMinute, 0, 0);

  const endTimeIST = new Date(nowIST);
  const [closeHour, closeMinute] = INDIAN_MARKET_SESSION.close.split(":").map(Number);
  endTimeIST.setHours(closeHour, closeMinute, 0, 0);

  // Check if the current time is within the range
  return nowIST >= startTimeIST && nowIST <= endTimeIST;
};

export default isTradingActive;
