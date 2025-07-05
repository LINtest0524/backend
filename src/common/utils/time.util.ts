const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ UTC Date → 台灣時間的 datetime-local 格式（input 用）
const toTaiwanDatetimeString = (date) => {
  return dayjs(date).tz('Asia/Taipei').format('YYYY-MM-DDTHH:mm');
};

// ✅ UTC Date → 顯示用格式
const toTaiwanDisplayTime = (date) => {
  return dayjs(date).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm');
};

module.exports = {
  toTaiwanDatetimeString,
  toTaiwanDisplayTime,
};
