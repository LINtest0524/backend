-- 代理商層級架構遷移腳本 (PostgreSQL)
-- 執行前請先備份資料庫！

-- 第一步：新增代理商層級相關欄位
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "agent_level" integer NULL,
ADD COLUMN IF NOT EXISTS "parent_agent_id" integer NULL,
ADD COLUMN IF NOT EXISTS "agent_code" varchar(50) NULL;

-- 第二步：新增外鍵約束 (parent_agent_id 參考 user.id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_user_parent_agent'
    ) THEN
        ALTER TABLE "user" 
        ADD CONSTRAINT "FK_user_parent_agent" 
        FOREIGN KEY ("parent_agent_id") REFERENCES "user"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 第三步：為 agent_code 新增唯一索引 (但允許 NULL)
DROP INDEX IF EXISTS "IDX_user_agent_code";
CREATE UNIQUE INDEX "IDX_user_agent_code" ON "user"("agent_code") WHERE "agent_code" IS NOT NULL;

-- 第四步：資料遷移 - 將現有的 AGENT_OWNER 轉為一級代理商
UPDATE "user" 
SET 
  "agent_level" = 1,
  "agent_code" = 'AGENT_' || "id" || '_' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE "role" = 'AGENT_OWNER' AND "agent_level" IS NULL;

-- 第五步：為已存在的一級代理商生成代理商代碼 (如果沒有的話)
UPDATE "user" 
SET "agent_code" = 'AGENT_' || "id" || '_' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE "agent_level" = 1 AND "agent_code" IS NULL;

-- 檢查遷移結果
SELECT 
  id, 
  username, 
  role, 
  agent_level, 
  parent_agent_id, 
  agent_code,
  created_at
FROM "user" 
WHERE role IN ('AGENT_OWNER', 'AGENT_SUPPORT') 
ORDER BY created_at;

-- 顯示統計資訊
SELECT 
  role,
  agent_level,
  COUNT(*) as count
FROM "user" 
GROUP BY role, agent_level
ORDER BY role, agent_level;