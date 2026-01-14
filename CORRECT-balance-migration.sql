-- ✅ 正確的餘額欄位遷移腳本
-- 這個腳本示範如何安全地將 balance 從 integer 改為 numeric(12,2)
-- ⚠️ 僅供參考，未來類似變更請按此模式操作

BEGIN;

-- Step 1: 建立備份表
CREATE TABLE IF NOT EXISTS user_balance_backup AS 
SELECT id, username, balance, created_at, updated_at FROM "user";

CREATE TABLE IF NOT EXISTS wallet_transactions_backup AS 
SELECT * FROM wallet_transactions;

-- Step 2: 記錄遷移前的統計資料
CREATE TEMP TABLE migration_stats AS
SELECT 
    'BEFORE' as stage,
    (SELECT COUNT(*) FROM "user") as total_users,
    (SELECT SUM(balance) FROM "user") as total_balance,
    (SELECT COUNT(*) FROM wallet_transactions) as total_transactions,
    NOW() as recorded_at;

-- Step 3: 修改 user 表的 balance 欄位
ALTER TABLE "user" 
ALTER COLUMN balance TYPE NUMERIC(12, 2) 
USING COALESCE(balance, 0)::numeric(12, 2);

ALTER TABLE "user" 
ALTER COLUMN balance SET DEFAULT 0;

-- Step 4: 修改 wallet_transactions 表
ALTER TABLE wallet_transactions
ALTER COLUMN amount TYPE NUMERIC(12, 2) 
USING COALESCE(amount, 0)::numeric(12, 2);

ALTER TABLE wallet_transactions
ALTER COLUMN balance_before TYPE NUMERIC(12, 2) 
USING COALESCE(balance_before, 0)::numeric(12, 2);

ALTER TABLE wallet_transactions
ALTER COLUMN balance_after TYPE NUMERIC(12, 2) 
USING COALESCE(balance_after, 0)::numeric(12, 2);

-- Step 5: 記錄遷移後的統計資料
INSERT INTO migration_stats
SELECT 
    'AFTER' as stage,
    (SELECT COUNT(*) FROM "user") as total_users,
    (SELECT SUM(balance) FROM "user") as total_balance,
    (SELECT COUNT(*) FROM wallet_transactions) as total_transactions,
    NOW() as recorded_at;

-- Step 6: 驗證資料完整性
DO $$
DECLARE
    before_users INTEGER;
    after_users INTEGER;
    before_balance NUMERIC;
    after_balance NUMERIC;
BEGIN
    SELECT total_users, total_balance INTO before_users, before_balance 
    FROM migration_stats WHERE stage = 'BEFORE';
    
    SELECT total_users, total_balance INTO after_users, after_balance 
    FROM migration_stats WHERE stage = 'AFTER';
    
    -- 檢查用戶數是否一致
    IF before_users != after_users THEN
        RAISE EXCEPTION 'User count mismatch! Before: %, After: %', before_users, after_users;
    END IF;
    
    -- 檢查餘額總和是否一致（允許 1 元的誤差，因為四捨五入）
    IF ABS(before_balance - after_balance) > 1 THEN
        RAISE EXCEPTION 'Balance sum mismatch! Before: %, After: %', before_balance, after_balance;
    END IF;
    
    RAISE NOTICE 'Migration validation passed!';
    RAISE NOTICE 'Users: %', after_users;
    RAISE NOTICE 'Total balance: %', after_balance;
END $$;

-- Step 7: 顯示遷移結果
SELECT * FROM migration_stats;

COMMIT;

-- 遷移完成後，可以在確認無誤後設定 NOT NULL 約束
-- ALTER TABLE "user" ALTER COLUMN balance SET NOT NULL;
-- ALTER TABLE wallet_transactions ALTER COLUMN amount SET NOT NULL;
-- ALTER TABLE wallet_transactions ALTER COLUMN balance_before SET NOT NULL;
-- ALTER TABLE wallet_transactions ALTER COLUMN balance_after SET NOT NULL;

-- 回滾腳本（如果需要）
/*
BEGIN;
-- 從備份恢復
UPDATE "user" u 
SET balance = b.balance 
FROM user_balance_backup b 
WHERE u.id = b.id;

UPDATE wallet_transactions wt
SET 
    amount = b.amount,
    balance_before = b.balance_before,
    balance_after = b.balance_after
FROM wallet_transactions_backup b
WHERE wt.id = b.id;
COMMIT;
*/
