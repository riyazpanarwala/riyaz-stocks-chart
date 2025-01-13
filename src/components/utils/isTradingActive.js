// Function to check if the current time is between 9:15 AM and 3:30 PM IST
const isTradingActive = () => {
  // Get the current time in UTC
  const nowUTC = new Date();

  // Convert the current time to IST
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET);

  // Define the start and end times in IST
  const startTimeIST = new Date(nowIST);
  startTimeIST.setHours(9, 15, 0, 0); // 9:15 AM IST

  const endTimeIST = new Date(nowIST);
  endTimeIST.setHours(15, 30, 0, 0); // 3:30 PM IST

  // Check if the current time is within the range
  return nowIST >= startTimeIST && nowIST <= endTimeIST;
};

export default isTradingActive;
