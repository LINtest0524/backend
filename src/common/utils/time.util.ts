import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ UTC Date -> 台灣時間的 datetime-local 格式（前端 input 用）
export const toTaiwanDatetimeString = (date: Date | string) => {
  return dayjs(date).tz('Asia/Taipei').format('YYYY-MM-DDTHH:mm');
};

// ✅ UTC Date -> 顯示用格式
export const toTaiwanDisplayTime = (date: Date | string) => {
  return dayjs(date).tz('Asia/Taipei').format('YYYY/MM/DD HH:mm');
};
