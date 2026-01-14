/**
 * 金額轉換工具函式
 * 系統內部以「分」儲存，API 傳輸以「元」為單位
 */

/**
 * 分 → 元
 * @param cents 金額(分)
 * @returns 金額(元)，保留2位小數
 */
export function centsToYuan(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * 元 → 分
 * @param yuan 金額(元)
 * @returns 金額(分)
 */
export function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

/**
 * 格式化金額顯示(元)
 * @param cents 金額(分)
 * @returns 格式化字串，例如: "123.45"
 */
export function formatAmount(cents: number): string {
  return centsToYuan(cents).toFixed(2);
}
