# 會員餘額小數點支援修改總結

## 修改日期
2026-01-15

## 修改目的
將會員餘額從整數改為支援小數點後2位，以便更精確地處理金額。

## 主要修改檔案

### 1. Entity 層修改

#### `Project/backend/src/user/user.entity.ts`
- **修改**: `balance` 欄位類型
- **變更**: `@Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })`
- **說明**: 支援12位數字，小數點後2位

#### `Project/backend/src/wallet-transaction/wallet-transaction.entity.ts`
- **修改**: `amount`, `balanceBefore`, `balanceAfter` 欄位類型
- **變更**: 全部改為 `@Column({ type: 'numeric', precision: 12, scale: 2 })`
- **說明**: 交易金額和餘額記錄也支援小數點

### 2. 遊戲 API 服務修改

#### `Project/backend/src/game-provider-gsc/services/game-provider-gsc.service.ts`
- **移除**: 所有 `yuanToCents()` 和 `centsToYuan()` 轉換函數的使用
- **改為**: 直接使用元為單位，並使用 `parseFloat().toFixed(2)` 確保精度
- **主要修改**:
  - Balance API: 直接返回格式化後的餘額
  - Withdraw API: 金額計算使用 `parseFloat((balance - amount).toFixed(2))`
  - Deposit API: 金額計算使用 `parseFloat((balance + amount).toFixed(2))`
  - PushBetData: 注單金額直接使用 `parseFloat(amount.toFixed(2))`

### 3. 餘額操作控制器修改

#### `Project/backend/src/user/balance-operations.controller.ts`
- **移除**: `Math.round(amount)` 整數四捨五入邏輯
- **改為**: `parseFloat(amount.toFixed(2))` 保留小數點後2位
- **修改點**:
  - 金額輸入處理
  - 餘額計算
  - 回傳結果格式化

### 4. 使用者服務修改

#### `Project/backend/src/user/user.service.ts`
- **修改方法**:
  - `findAll()`: 返回餘額時使用 `parseFloat((balance || 0).toFixed(2))`
  - `updateBalance()`: 
    - 計算新餘額: `parseFloat((oldBalance + amount).toFixed(2))`
    - 錯誤訊息顯示: 使用 `toFixed(2)` 格式化金額
    - 審計日誌: 所有金額顯示都格式化為2位小數
  - `updateBalanceForCheckin()`: 簽到獎勵金額計算和顯示都使用 `.toFixed(2)`

## 數據庫遷移

需要執行的 SQL 檔案: `Project/backend/alter-balance-to-numeric.sql`

```sql
ALTER TABLE "user" 
ALTER COLUMN balance TYPE NUMERIC(12, 2);

ALTER TABLE "wallet_transactions"
ALTER COLUMN amount TYPE NUMERIC(12, 2),
ALTER COLUMN balance_before TYPE NUMERIC(12, 2),
ALTER COLUMN balance_after TYPE NUMERIC(12, 2);
```

## 注意事項

1. **不使用 `npm run build`**: 依照指示，不執行建置指令
2. **測試由使用者執行**: 所有修改完成，等待使用者測試
3. **保持向後相容**: 整數金額會自動轉換為 `.00` 格式
4. **精度控制**: 所有計算都使用 `parseFloat().toFixed(2)` 確保不會有浮點數精度問題

## API 回傳格式範例

### Before (整數)
```json
{
  "balance": 1000
}
```

### After (小數點後2位)
```json
{
  "balance": 1000.50
}
```

## 完成狀態

✅ Entity 欄位修改完成
✅ 遊戲 API 服務修改完成  
✅ 餘額操作控制器修改完成
✅ 使用者服務格式化完成
✅ 所有顯示餘額的地方都加上 toFixed(2)

**修改已全部完成，請進行測試！**
