-- 檢查現有的用戶結構，特別是代理商相關欄位
-- 查看 users 表結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 查看現有的代理商用戶
SELECT 
    id,
    username,
    role,
    company_id,
    agent_level,
    created_at
FROM users 
WHERE role LIKE '%AGENT%' 
ORDER BY company_id, agent_level, id;

-- 檢查是否有現有的代理商管理相關表
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%agent%' 
AND table_schema = 'public';