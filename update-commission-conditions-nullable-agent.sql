-- 更新 commission_conditions 表，允許 agent_id 為 null
-- 這樣可以支援「任意代理商」選項（agent_id = 0 或 null）

ALTER TABLE commission_conditions 
ALTER COLUMN agent_id DROP NOT NULL;

-- 設定預設值為 0（代表任意代理商）
ALTER TABLE commission_conditions 
ALTER COLUMN agent_id SET DEFAULT 0;

-- 更新現有的 Foreign Key 約束，允許 nullable
-- 首先查看現有的外鍵約束名稱
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'commission_conditions' AND constraint_type = 'FOREIGN KEY';

-- 刪除現有的外鍵約束（假設約束名稱包含 agent_id）
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- 查找包含 agent_id 的外鍵約束
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
    WHERE kcu.table_name = 'commission_conditions' 
        AND kcu.column_name = 'agent_id'
        AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;
    
    -- 如果找到約束，則刪除它
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE commission_conditions DROP CONSTRAINT %I', constraint_name_var);
        RAISE NOTICE '已刪除外鍵約束: %', constraint_name_var;
    ELSE
        RAISE NOTICE '未找到 agent_id 的外鍵約束';
    END IF;
END $$;

-- 重新建立外鍵約束，允許 null 值
ALTER TABLE commission_conditions 
ADD CONSTRAINT fk_commission_conditions_agent_id 
FOREIGN KEY (agent_id) REFERENCES "user"(id) ON DELETE SET NULL;

-- 驗證更改
SELECT 
    column_name,
    is_nullable,
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'commission_conditions' 
    AND column_name = 'agent_id';

RAISE NOTICE '✅ commission_conditions 表已更新，agent_id 現在可以為 null';
RAISE NOTICE '💡 agent_id = 0 或 null 代表「任意代理商」';