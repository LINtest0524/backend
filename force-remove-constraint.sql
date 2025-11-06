-- 強制刪除頑固的外鍵約束

-- 1. 直接刪除特定約束（不使用 IF EXISTS）
ALTER TABLE commission_conditions DROP CONSTRAINT "FK_5efaf150d7e0bcdfc0a97508a8b";

-- 2. 查看所有相關約束
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
WHERE tc.table_name = 'commission_conditions' 
    AND tc.constraint_type = 'FOREIGN KEY';

-- 3. 確認 agent_id 欄位狀態
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'commission_conditions' 
    AND column_name = 'agent_id';

-- 4. 嘗試手動插入測試資料
INSERT INTO commission_conditions (
    name, 
    method, 
    "isActive", 
    company_id, 
    agent_id
) VALUES (
    'TEST-任意代理商',
    'SETTLEMENT_ACTIVE_MEMBERS',
    true,
    3,
    0
);

-- 5. 查看插入結果
SELECT 
    id,
    name,
    agent_id,
    company_id
FROM commission_conditions 
WHERE name = 'TEST-任意代理商';

-- 6. 清理測試資料
DELETE FROM commission_conditions WHERE name = 'TEST-任意代理商';

SELECT '外鍵約束強制刪除完成！' as message;