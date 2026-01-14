# 🛡️ 安全的資料庫遷移指南

## ⚠️ 本次事件教訓

**問題**: 修改欄位型別時,直接將 NULL 改為 0,導致所有會員餘額遺失

**原因**: 
1. TypeORM 的 `synchronize: true` 會自動同步 schema
2. 修改欄位屬性時沒有妥善處理現有資料
3. 沒有在遷移前備份資料

---

## ✅ 正確的資料庫遷移流程

### 第一步：關閉自動同步 (生產環境必須)

```typescript
// Project/backend/src/app.module.ts
TypeOrmModule.forRoot({
  // ...
  synchronize: false,  // ⚠️ 生產環境必須設為 false
  logging: true,
})
```

### 第二步：遷移前必做檢查清單

```sql
-- 1. 備份整個資料庫
pg_dump -U username -d database_name -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).backup

-- 2. 統計現有資料
SELECT COUNT(*) FROM "user" WHERE balance IS NOT NULL AND balance > 0;
SELECT COUNT(*) FROM wallet_transactions;

-- 3. 匯出重要資料 (CSV 備份)
COPY (SELECT id, username, balance FROM "user" WHERE balance > 0) 
TO '/tmp/user_balance_backup.csv' CSV HEADER;
```

### 第三步：安全的欄位型別變更

```sql
-- ❌ 錯誤做法：直接設 NULL 為 0
UPDATE wallet_transactions SET amount = 0 WHERE amount IS NULL;

-- ✅ 正確做法：先檢查、再處理、後驗證

-- 1. 檢查有多少 NULL 值
SELECT 
    COUNT(*) as total,
    COUNT(amount) as not_null_amount,
    COUNT(*) - COUNT(amount) as null_amount
FROM wallet_transactions;

-- 2. 如果 NULL 值不應該存在，找出原因
SELECT * FROM wallet_transactions WHERE amount IS NULL LIMIT 10;

-- 3. 備份會被影響的資料
CREATE TABLE wallet_transactions_backup AS 
SELECT * FROM wallet_transactions WHERE amount IS NULL;

-- 4. 謹慎處理 NULL 值（根據業務邏輯決定）
UPDATE wallet_transactions 
SET amount = COALESCE(amount, 0)  -- 使用 COALESCE 更安全
WHERE amount IS NULL;

-- 5. 修改欄位型別
ALTER TABLE wallet_transactions 
ALTER COLUMN amount TYPE NUMERIC(12, 2) USING amount::numeric(12, 2);

-- 6. 驗證結果
SELECT COUNT(*) FROM wallet_transactions WHERE amount = 0;
```

### 第四步：測試環境先驗證

```bash
# 1. 在測試資料庫執行
psql -U username -d test_database -f migration.sql

# 2. 驗證資料完整性
psql -U username -d test_database -c "SELECT COUNT(*), SUM(balance) FROM user;"

# 3. 確認無誤後才在生產環境執行
```

---

## 📋 未來修改 balance 相關欄位的標準流程

### 範例：安全地將 balance 從 integer 改為 numeric(12,2)

```sql
-- Step 1: 備份
CREATE TABLE user_balance_backup_20260115 AS 
SELECT id, username, balance FROM "user";

-- Step 2: 檢查現有資料
SELECT 
    COUNT(*) as total_users,
    COUNT(balance) as has_balance,
    SUM(balance) as total_balance,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance
FROM "user";

-- Step 3: 修改欄位型別（保留原有數值）
ALTER TABLE "user" 
ALTER COLUMN balance TYPE NUMERIC(12, 2) 
USING balance::numeric(12, 2);

-- Step 4: 設定預設值和非空限制
ALTER TABLE "user" 
ALTER COLUMN balance SET DEFAULT 0;

-- Step 5: 只在確認沒問題後才設 NOT NULL
-- ALTER TABLE "user" 
-- ALTER COLUMN balance SET NOT NULL;

-- Step 6: 驗證
SELECT 
    COUNT(*) as total_users,
    SUM(balance) as total_balance_after,
    (SELECT SUM(balance) FROM user_balance_backup_20260115) as total_balance_before
FROM "user";

-- Step 7: 確認前後金額一致後，可以刪除備份表
-- DROP TABLE user_balance_backup_20260115;
```

---

## 🚨 生產環境部署檢查清單

### 部署前 (Pre-deployment)
- [ ] 完整資料庫備份
- [ ] 匯出關鍵資料 CSV
- [ ] 在測試環境完整測試遷移腳本
- [ ] 準備回滾腳本
- [ ] 估算停機時間
- [ ] 通知相關人員

### 部署中 (During deployment)
- [ ] 設定維護模式
- [ ] 執行遷移腳本
- [ ] 即時監控錯誤
- [ ] 驗證資料完整性
- [ ] 測試核心功能

### 部署後 (Post-deployment)
- [ ] 比對資料總數
- [ ] 驗證餘額總和一致
- [ ] 測試存款/提款功能
- [ ] 監控錯誤日誌
- [ ] 保留備份至少 30 天

---

## 🔧 實用的資料驗證 SQL

```sql
-- 1. 比對遷移前後的餘額總和
SELECT 
    (SELECT SUM(balance) FROM user_backup) as before_migration,
    (SELECT SUM(balance) FROM "user") as after_migration,
    (SELECT SUM(balance) FROM user_backup) - (SELECT SUM(balance) FROM "user") as difference;

-- 2. 找出餘額異常的用戶
SELECT id, username, balance 
FROM "user" 
WHERE balance < 0 OR balance > 10000000;

-- 3. 檢查交易記錄完整性
SELECT 
    u.id,
    u.username,
    u.balance as current_balance,
    COALESCE(wt.balance_after, 0) as last_transaction_balance,
    u.balance - COALESCE(wt.balance_after, 0) as difference
FROM "user" u
LEFT JOIN LATERAL (
    SELECT balance_after 
    FROM wallet_transactions 
    WHERE user_id = u.id 
    ORDER BY created_at DESC 
    LIMIT 1
) wt ON true
WHERE ABS(u.balance - COALESCE(wt.balance_after, 0)) > 0.01;
```

---

## 📝 遷移腳本模板

```sql
-- migration_YYYYMMDD_HHMM_description.sql
-- 描述：修改 balance 欄位支援小數點
-- 日期：2026-01-15
-- 作者：[Your Name]

BEGIN;

-- 1. 建立備份表
CREATE TABLE IF NOT EXISTS user_balance_backup_20260115 AS 
SELECT id, username, balance, updated_at FROM "user";

-- 2. 記錄遷移開始
INSERT INTO migration_log (migration_name, status, started_at) 
VALUES ('add_decimal_to_balance', 'STARTED', NOW());

-- 3. 執行變更
ALTER TABLE "user" 
ALTER COLUMN balance TYPE NUMERIC(12, 2) 
USING balance::numeric(12, 2);

-- 4. 驗證
DO $$
DECLARE
    before_sum NUMERIC;
    after_sum NUMERIC;
BEGIN
    SELECT SUM(balance) INTO before_sum FROM user_balance_backup_20260115;
    SELECT SUM(balance) INTO after_sum FROM "user";
    
    IF ABS(before_sum - after_sum) > 0.01 THEN
        RAISE EXCEPTION 'Balance mismatch! Before: %, After: %', before_sum, after_sum;
    END IF;
END $$;

-- 5. 記錄遷移完成
UPDATE migration_log 
SET status = 'COMPLETED', completed_at = NOW() 
WHERE migration_name = 'add_decimal_to_balance';

COMMIT;

-- 6. 回滾腳本 (另存為 rollback_YYYYMMDD_HHMM.sql)
/*
BEGIN;
ALTER TABLE "user" ALTER COLUMN balance TYPE INTEGER USING balance::integer;
UPDATE "user" u SET balance = b.balance FROM user_balance_backup_20260115 b WHERE u.id = b.id;
COMMIT;
*/
```

---

## 💡 最佳實踐建議

1. **永遠不要在生產環境用 `synchronize: true`**
2. **所有 schema 變更都要寫遷移腳本**
3. **遷移前必須備份**
4. **使用事務包裝遷移腳本**
5. **準備回滾方案**
6. **測試環境先驗證**
7. **保留歷史備份至少 30 天**
8. **關鍵操作要有審計日誌**

---

## 🎯 本次修改的正確流程應該是

```sql
-- 1. 備份
CREATE TABLE user_backup AS SELECT * FROM "user";
CREATE TABLE wallet_transactions_backup AS SELECT * FROM wallet_transactions;

-- 2. 檢查資料
SELECT COUNT(*), SUM(balance) FROM "user";

-- 3. 修改型別（不改變數值）
ALTER TABLE "user" 
ALTER COLUMN balance TYPE NUMERIC(12, 2) 
USING balance::numeric(12, 2);

ALTER TABLE wallet_transactions
ALTER COLUMN amount TYPE NUMERIC(12, 2) 
USING COALESCE(amount, 0)::numeric(12, 2);

-- 4. 驗證
SELECT COUNT(*), SUM(balance) FROM "user";

-- 5. 確認無誤後才設定約束
ALTER TABLE "user" ALTER COLUMN balance SET NOT NULL;
```

---

## 📞 緊急情況處理

如果發生資料遺失:
1. 立即停止所有寫入操作
2. 從最近的備份恢復
3. 檢查交易日誌重建資料
4. 通知所有相關人員
5. 撰寫事故報告

記住：**資料無價，謹慎為上！**
