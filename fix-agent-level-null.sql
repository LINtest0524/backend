-- 修復代理商的 agent_level 欄位為 null 的問題
-- 根據 role 欄位設定對應的 agent_level 值

-- 檢查目前有問題的代理商
SELECT 
  id, 
  username, 
  role, 
  agent_level, 
  company_id
FROM "user" 
WHERE role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  AND agent_level IS NULL
ORDER BY id;

-- 修復 AGENT_LEVEL_1 的 agent_level
UPDATE "user" 
SET agent_level = 1
WHERE role = 'AGENT_LEVEL_1' AND agent_level IS NULL;

-- 修復 AGENT_LEVEL_2 的 agent_level
UPDATE "user" 
SET agent_level = 2
WHERE role = 'AGENT_LEVEL_2' AND agent_level IS NULL;

-- 修復 AGENT_LEVEL_3 的 agent_level
UPDATE "user" 
SET agent_level = 3
WHERE role = 'AGENT_LEVEL_3' AND agent_level IS NULL;

-- 修復 AGENT_LEVEL_4 的 agent_level
UPDATE "user" 
SET agent_level = 4
WHERE role = 'AGENT_LEVEL_4' AND agent_level IS NULL;

-- 確保一級代理商都有代理商代碼
UPDATE "user" 
SET agent_code = 'AGENT_' || id || '_' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE role = 'AGENT_LEVEL_1' AND agent_code IS NULL;

-- 檢查修復結果
SELECT 
  id, 
  username, 
  role, 
  agent_level, 
  agent_code,
  company_id
FROM "user" 
WHERE role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
ORDER BY company_id, agent_level, id;