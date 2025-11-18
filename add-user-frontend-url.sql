-- 新增 user 表的 frontend_url 欄位
-- 2024-01-XX: 支援代理商子站功能

-- 新增 frontend_url 欄位到 user 表
ALTER TABLE "user" 
ADD COLUMN frontend_url VARCHAR(50) NULL;

-- 新增欄位註解
COMMENT ON COLUMN "user".frontend_url IS '代理前台子域名（如：seo01），與company組合成完整URL';

-- 新增唯一性約束：同一公司內代理子域名不能重複
ALTER TABLE "user" 
ADD CONSTRAINT uk_user_company_frontend_url 
UNIQUE (company_id, frontend_url);

-- 新增索引以提升查詢效能
CREATE INDEX idx_user_frontend_url ON "user" (frontend_url);

-- 驗證新增是否成功
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user' AND column_name = 'frontend_url';