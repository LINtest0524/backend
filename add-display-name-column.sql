-- 新增 display_name 欄位用於存儲代理名稱(暱稱)
-- agent_name 用於存儲代理姓名(真實姓名)

-- 1. 新增 display_name 欄位
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- 2. 將現有的 agent_name 資料複製到 display_name (作為預設值)
UPDATE "user" 
SET display_name = agent_name 
WHERE role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 
               'AGENT_LEVEL_5', 'AGENT_LEVEL_6', 'AGENT_LEVEL_7', 'AGENT_LEVEL_8',
               'AGENT_LEVEL_9', 'AGENT_LEVEL_10', 'AGENT_LEVEL_11', 'AGENT_LEVEL_12')
AND display_name IS NULL;

-- 3. 驗證結果
SELECT id, username, display_name, agent_name, role 
FROM "user" 
WHERE role LIKE 'AGENT_%'
ORDER BY id
LIMIT 10;
