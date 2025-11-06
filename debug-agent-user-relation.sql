-- 檢查代理商和用戶的關聯關係
-- 查看現有的代理商資料
SELECT 
    a.id as agent_id,
    a.display_name,
    a.login_account,
    a.agent_level,
    a.parent_agent_id,
    a.user_id,
    a.company_id
FROM agents a
ORDER BY a.company_id, a.agent_level, a.id;

-- 查看用戶資料
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    u.company_id,
    u.agent_level
FROM users u
WHERE u.role LIKE '%AGENT%'
ORDER BY u.company_id, u.id;

-- 檢查代理商和用戶的關聯
SELECT 
    a.id as agent_id,
    a.display_name,
    a.login_account,
    a.user_id,
    u.id as actual_user_id,
    u.username,
    u.role,
    CASE 
        WHEN a.user_id = u.id THEN '✅ 關聯正確'
        WHEN a.user_id IS NULL THEN '❌ 代理商沒有關聯用戶'
        ELSE '❌ 關聯錯誤'
    END as relation_status
FROM agents a
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.company_id, a.id;