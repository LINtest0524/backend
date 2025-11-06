-- 徹底移除所有 commission_conditions 表上的 agent_id 外鍵約束
-- 包括 TypeORM 自動生成的約束

-- 1. 查找並刪除所有相關的外鍵約束
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- 查找所有指向 agent_id 欄位的外鍵約束
    FOR constraint_record IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'commission_conditions' 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'agent_id'
    LOOP
        EXECUTE format('ALTER TABLE commission_conditions DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
        RAISE NOTICE '已刪除外鍵約束: %', constraint_record.constraint_name;
    END LOOP;
    
    -- 也嘗試刪除可能的約束名稱變體
    BEGIN
        ALTER TABLE commission_conditions DROP CONSTRAINT IF EXISTS "FK_5efaf150d7e0bcdfc0a97508a8b";
        RAISE NOTICE '已刪除 TypeORM 約束: FK_5efaf150d7e0bcdfc0a97508a8b';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '約束 FK_5efaf150d7e0bcdfc0a97508a8b 不存在或已刪除';
    END;
    
    -- 嘗試刪除其他可能的 agent_id 外鍵約束
    BEGIN
        ALTER TABLE commission_conditions DROP CONSTRAINT IF EXISTS fk_commission_conditions_agent;
        RAISE NOTICE '已刪除自定義約束: fk_commission_conditions_agent';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '約束 fk_commission_conditions_agent 不存在或已刪除';
    END;
    
    BEGIN
        ALTER TABLE commission_conditions DROP CONSTRAINT IF EXISTS fk_commission_conditions_agent_id;
        RAISE NOTICE '已刪除自定義約束: fk_commission_conditions_agent_id';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE '約束 fk_commission_conditions_agent_id 不存在或已刪除';
    END;
END $$;

-- 2. 確保 agent_id 欄位可以為 null 或 0
ALTER TABLE commission_conditions 
ALTER COLUMN agent_id DROP NOT NULL;

ALTER TABLE commission_conditions 
ALTER COLUMN agent_id SET DEFAULT 0;

-- 3. 檢查剩餘的約束
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'commission_conditions' 
    AND kcu.column_name = 'agent_id';

-- 4. 顯示 agent_id 欄位的當前狀態
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'commission_conditions' 
    AND column_name = 'agent_id';

-- 5. 測試插入一筆 agent_id = 0 的記錄
SELECT '所有 agent_id 外鍵約束已徹底清除！現在可以使用 agent_id = 0' as message;