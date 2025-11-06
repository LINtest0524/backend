-- 建立代理商資料表
CREATE TABLE IF NOT EXISTS "agents" (
  "id" SERIAL PRIMARY KEY,
  "company_id" integer NOT NULL,
  "user_id" integer,
  "agent_level" integer NOT NULL,
  "parent_agent_id" integer,
  "display_name" varchar(100) NOT NULL,
  "phone" varchar(50),
  "email" varchar(150),
  "telegram" varchar(100),
  "line" varchar(100),
  "skype" varchar(100),
  "qq" varchar(100),
  "status" varchar(16) NOT NULL DEFAULT 'active',
  "login_account" varchar(64) UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "note" text,
  "revenue_share" decimal(5,2),
  "rebate_level" varchar(32),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS "IDX_agents_login_account" ON "agents" ("login_account");
CREATE INDEX IF NOT EXISTS "IDX_agents_company_id" ON "agents" ("company_id");
CREATE INDEX IF NOT EXISTS "IDX_agents_parent_agent_id" ON "agents" ("parent_agent_id");

-- 外鍵約束（可選，根據你的現有設定）
-- ALTER TABLE "agents" ADD CONSTRAINT "FK_agents_company" FOREIGN KEY ("company_id") REFERENCES "company"("id");
-- ALTER TABLE "agents" ADD CONSTRAINT "FK_agents_parent" FOREIGN KEY ("parent_agent_id") REFERENCES "agents"("id");

-- 插入測試資料
INSERT INTO agents (company_id, agent_level, display_name, status, login_account, password_hash, note) 
VALUES 
  (2, 1, '測試代理商B-1', 'active', 'agent_b_001', '$2b$12$example_hash_here', 'B公司一級代理商'),
  (3, 1, '測試代理商A-1', 'active', 'agent_a_001', '$2b$12$example_hash_here', 'A公司一級代理商')
ON CONFLICT (login_account) DO NOTHING;