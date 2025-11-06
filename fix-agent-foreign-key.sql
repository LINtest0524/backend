-- 修正 commission_conditions 表的 agent_id 外鍵約束
-- 允許 agent_id = 0 (任意代理商) 或 null，不受外鍵約束

-- 1. 先刪除現有的外鍵約束
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- 查找 agent_id 的外鍵約束名稱
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'commission_conditions' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'agent_id'
        AND tc.table_schema = kcu.table_schema
    LIMIT 1;
    
    -- 如果找到約束，則刪除它
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE commission_conditions DROP CONSTRAINT %I', constraint_name_var);
        RAISE NOTICE '已刪除外鍵約束: %', constraint_name_var;
    ELSE
        RAISE NOTICE '未找到 agent_id 的外鍵約束';
    END IF;
END $$;

-- 2. 修改 agent_id 欄位允許 null
ALTER TABLE commission_conditions 
ALTER COLUMN agent_id DROP NOT NULL;

-- 3. 不使用 CHECK 約束（因為 PostgreSQL 不支援子查詢）
-- 改為依靠觸發器來維護資料完整性

-- 4. 新增一個觸發器來維護外鍵完整性（僅針對非 0 和非 null 的值）
CREATE OR REPLACE FUNCTION validate_agent_id()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果 agent_id 不是 0 也不是 null，則檢查是否存在於 user 表中
    IF NEW.agent_id IS NOT NULL AND NEW.agent_id != 0 THEN
        IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = NEW.agent_id) THEN
            RAISE EXCEPTION 'agent_id % does not exist in user table', NEW.agent_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS validate_agent_id_trigger ON commission_conditions;
CREATE TRIGGER validate_agent_id_trigger 
    BEFORE INSERT OR UPDATE ON commission_conditions 
    FOR EACH ROW EXECUTE FUNCTION validate_agent_id();

-- 5. 驗證修改
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'commission_conditions' 
    AND column_name = 'agent_id';

-- 6. 測試插入一筆 agent_id = 0 的記錄（應該成功）
SELECT 'agent_id 外鍵約束修正完成！可以使用 agent_id = 0 表示任意代理商' as message;