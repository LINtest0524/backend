-- 檢查餘額狀況

-- 1. 檢查 user 表的餘額分布
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN balance = 0 THEN 1 END) as zero_balance_count,
    COUNT(CASE WHEN balance > 0 THEN 1 END) as positive_balance_count,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance,
    AVG(balance) as avg_balance
FROM "user";

-- 2. 查看最近的錢包交易記錄
SELECT 
    id,
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    created_at
FROM wallet_transactions
ORDER BY created_at DESC
LIMIT 20;

-- 3. 檢查是否有備份或歷史資料
-- 查看是否有其他相關表格
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%balance%' OR table_name LIKE '%wallet%' OR table_name LIKE '%transaction%';
