-- 添加登入方式配置欄位到 company 表
ALTER TABLE company 
ADD COLUMN loginMethods text DEFAULT 'USERNAME_PASSWORD,FACEBOOK';

-- 更新現有公司的登入方式配置
UPDATE company 
SET loginMethods = 'USERNAME_PASSWORD,FACEBOOK' 
WHERE loginMethods IS NULL OR loginMethods = '';

-- 查看更新結果
SELECT id, name, code, loginMethods FROM company;