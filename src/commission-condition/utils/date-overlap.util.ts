/**
 * 日期重疊檢查工具
 */
export class DateOverlapUtil {
  /**
   * 檢查兩個日期區間是否重疊
   * @param range1 第一個區間 [start, end]
   * @param range2 第二個區間 [start, end]
   * @returns 是否重疊
   */
  static hasOverlap(
    range1: [Date | null, Date | null],
    range2: [Date | null, Date | null]
  ): boolean {
    const [start1, end1] = range1;
    const [start2, end2] = range2;

    // 如果任一區間的開始時間為空，視為從無限早開始
    // 如果任一區間的結束時間為空，視為到無限晚結束

    const effectiveStart1 = start1 || new Date('1900-01-01');
    const effectiveEnd1 = end1 || new Date('2099-12-31');
    const effectiveStart2 = start2 || new Date('1900-01-01');
    const effectiveEnd2 = end2 || new Date('2099-12-31');

    // 檢查重疊邏輯：
    // 如果 range1 的結束時間 <= range2 的開始時間，或者
    // 如果 range2 的結束時間 <= range1 的開始時間，
    // 則不重疊，否則重疊
    return !(effectiveEnd1 <= effectiveStart2 || effectiveEnd2 <= effectiveStart1);
  }

  /**
   * 計算重疊的時間區間
   * @param range1 第一個區間
   * @param range2 第二個區間
   * @returns 重疊區間
   */
  static getOverlapRange(
    range1: [Date | null, Date | null],
    range2: [Date | null, Date | null]
  ): [Date, Date] | null {
    if (!this.hasOverlap(range1, range2)) {
      return null;
    }

    const [start1, end1] = range1;
    const [start2, end2] = range2;

    const effectiveStart1 = start1 || new Date('1900-01-01');
    const effectiveEnd1 = end1 || new Date('2099-12-31');
    const effectiveStart2 = start2 || new Date('1900-01-01');
    const effectiveEnd2 = end2 || new Date('2099-12-31');

    // 重疊區間的開始時間是兩個區間開始時間的較晚者
    const overlapStart = effectiveStart1 > effectiveStart2 ? effectiveStart1 : effectiveStart2;
    // 重疊區間的結束時間是兩個區間結束時間的較早者
    const overlapEnd = effectiveEnd1 < effectiveEnd2 ? effectiveEnd1 : effectiveEnd2;

    return [overlapStart, overlapEnd];
  }

  /**
   * 解析日期字串為Date對象
   * @param dateString 日期字串
   * @returns Date對象或null
   */
  static parseDate(dateString?: string): Date | null {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * 格式化日期為字串
   * @param date Date對象
   * @returns 格式化的日期字串
   */
  static formatDate(date: Date | null): string {
    if (!date) return '永久';
    
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * 生成調整建議
   * @param requestedRange 請求的時間範圍
   * @param conflictRanges 衝突的時間範圍數組
   * @returns 調整建議數組
   */
  static generateSuggestions(
    requestedRange: [Date | null, Date | null],
    conflictRanges: Array<[Date | null, Date | null]>
  ): string[] {
    const suggestions: string[] = [];
    const [requestStart, requestEnd] = requestedRange;

    // 找到所有衝突的最早開始時間和最晚結束時間
    let earliestConflictStart: Date | null = null;
    let latestConflictEnd: Date | null = null;

    for (const [conflictStart, conflictEnd] of conflictRanges) {
      const effectiveStart = conflictStart || new Date('1900-01-01');
      const effectiveEnd = conflictEnd || new Date('2099-12-31');

      if (!earliestConflictStart || effectiveStart < earliestConflictStart) {
        earliestConflictStart = effectiveStart;
      }
      if (!latestConflictEnd || effectiveEnd > latestConflictEnd) {
        latestConflictEnd = effectiveEnd;
      }
    }

    if (earliestConflictStart && latestConflictEnd) {
      // 建議在衝突之前開始
      if (requestStart) {
        const beforeConflict = new Date(earliestConflictStart);
        beforeConflict.setDate(beforeConflict.getDate() - 1);
        suggestions.push(`建議結束日期設為 ${this.formatDate(beforeConflict)} 之前`);
      }

      // 建議在衝突之後開始
      const afterConflict = new Date(latestConflictEnd);
      afterConflict.setDate(afterConflict.getDate() + 1);
      suggestions.push(`建議開始日期設為 ${this.formatDate(afterConflict)} 之後`);
    }

    return suggestions;
  }
}