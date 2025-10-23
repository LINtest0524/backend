-- 遷移現有代理商並為一級代理商生成代理商代碼
-- 這個腳本將現有的 AGENT_OWNER 角色轉換為 AGENT_LEVEL_1 並生成代理商代碼

-- 第一步：檢查現有的 AGENT_OWNER 用戶
SELECT 
  id, 
  username, 
  role, 
  agent_level, 
  agent_code,
  company_id
FROM "user" 
WHERE role = 'AGENT_OWNER'
ORDER BY id;

-- 第二步：將 AGENT_OWNER 角色更新為 AGENT_LEVEL_1
UPDATE "user" 
SET role = 'AGENT_LEVEL_1'
WHERE role = 'AGENT_OWNER';

-- 第三步：確保一級代理商都有代理商代碼（如果還沒有的話）
UPDATE "user" 
SET agent_code = 'AGENT_' || id || '_' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE role = 'AGENT_LEVEL_1' AND agent_code IS NULL;

-- 第四步：檢查遷移結果
SELECT 
  id, 
  username, 
  role, 
  agent_level, 
  agent_code,
  company_id,
  created_at
FROM "user" 
WHERE role IN ('AGENT_LEVEL_1', 'AGENT_OWNER') 
ORDER BY company_id, id;

-- 第五步：顯示可用的代理商代碼（供測試使用）
SELECT 
  CONCAT('代理商: ', username, ' (ID: ', id, ') - 代碼: ', agent_code) as 代理商資訊
FROM "user" 
WHERE role = 'AGENT_LEVEL_1' AND agent_code IS NOT NULL
ORDER BY id;