-- 新增代理前台子域名欄位
-- 2024-01-XX: 支援代理商子站功能

-- 新增 frontend_url 欄位 (PostgreSQL語法)
ALTER TABLE agents 
ADD COLUMN frontend_url VARCHAR(50) NULL;

-- 新增欄位註解 (PostgreSQL語法)
COMMENT ON COLUMN agents.frontend_url IS '代理前台子域名（如：seo01），與company組合成完整URL';

-- 新增唯一性約束：同一公司內代理子域名不能重複
-- 注意：NULL值不會觸發唯一性約束，所以允許多個代理沒有設定子域名
ALTER TABLE agents 
ADD CONSTRAINT uk_agents_company_frontend_url 
UNIQUE (company_id, frontend_url);

-- 新增索引以提升查詢效能
CREATE INDEX idx_agents_frontend_url ON agents (frontend_url);

-- 驗證新增是否成功 (標準SQL語法)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;