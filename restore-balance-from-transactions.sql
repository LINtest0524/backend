-- 從 wallet_transactions 恢復最新餘額

-- 方法1: 使用 balance_after 來恢復每個用戶的最新餘額
-- 這個腳本會找出每個用戶最後一筆交易的 balance_after，並更新到 user 表

UPDATE "user" u
SET balance = latest.balance_after
FROM (
    SELECT DISTINCT ON (user_id) 
        user_id,
        balance_after
    FROM wallet_transactions
    ORDER BY user_id, created_at DESC
) as latest
WHERE u.id = latest.user_id;

-- 驗證恢復結果
SELECT 
    u.id,
    u.username,
    u.balance as current_balance,
    latest_tx.balance_after as last_transaction_balance,
    latest_tx.created_at as last_transaction_time
FROM "user" u
LEFT JOIN LATERAL (
    SELECT balance_after, created_at
    FROM wallet_transactions
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
) latest_tx ON true
WHERE u.role = 'USER'
ORDER BY u.id
LIMIT 20;
