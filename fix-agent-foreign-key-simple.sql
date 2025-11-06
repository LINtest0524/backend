-- 簡化版本：修正 commission_conditions 表的 agent_id 外鍵約束
-- 只依靠觸發器來維護資料完整性

-- 1. 確保 agent_id 欄位允許 null
ALTER TABLE commission_conditions 
ALTER COLUMN agent_id DROP NOT NULL;

-- 2. 設定預設值為 0（任意代理商）
ALTER TABLE commission_conditions 
ALTER COLUMN agent_id SET DEFAULT 0;

-- 3. 新增觸發器來維護外鍵完整性（僅針對非 0 和非 null 的值）
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

-- 4. 建立觸發器
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

-- 6. 完成訊息
SELECT 'agent_id 外鍵約束修正完成！可以使用 agent_id = 0 表示任意代理商' as message;