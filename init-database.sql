-- 初始化資料庫腳本
-- 此腳本會創建超級管理員帳號和代理商公司 A、B

-- 1. 創建代理商公司 A 和 B
INSERT INTO company (id, name, code, "passwordModes", "loginMethods") VALUES 
(1, '代理商公司A', 'a', '{OLD_PASSWORD}', '{USERNAME_PASSWORD,FACEBOOK}'),
(2, '代理商公司B', 'b', '{OLD_PASSWORD}', '{USERNAME_PASSWORD,FACEBOOK}')
ON CONFLICT (id) DO NOTHING;

-- 2. 創建超級管理員帳號
-- 密碼是 123456，已經用 bcrypt 加密
INSERT INTO "user" (
    username, 
    password, 
    role, 
    status, 
    created_at, 
    updated_at
) VALUES (
    'superadmin', 
    '$2b$10$2SB1NKzgdueNgyea9njtSujTYwEDXr3k4CTstkCtN90EnSDzZENcu', 
    'SUPER_ADMIN', 
    'ACTIVE', 
    NOW(), 
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 3. 為代理商公司 A 創建管理員帳號
INSERT INTO "user" (
    username, 
    password, 
    role, 
    status, 
    company_id,
    created_at, 
    updated_at
) VALUES (
    'admin_a', 
    '$2b$10$2SB1NKzgdueNgyea9njtSujTYwEDXr3k4CTstkCtN90EnSDzZENcu', 
    'AGENT_OWNER', 
    'ACTIVE', 
    1,
    NOW(), 
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 4. 為代理商公司 B 創建管理員帳號
INSERT INTO "user" (
    username, 
    password, 
    role, 
    status, 
    company_id,
    created_at, 
    updated_at
) VALUES (
    'admin_b', 
    '$2b$10$2SB1NKzgdueNgyea9njtSujTYwEDXr3k4CTstkCtN90EnSDzZENcu', 
    'AGENT_OWNER', 
    'ACTIVE', 
    2,
    NOW(), 
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 5. 重置序列號（如果需要）
SELECT setval('company_id_seq', (SELECT MAX(id) FROM company));
SELECT setval('user_id_seq', (SELECT MAX(id) FROM "user"));

-- 6. 顯示創建的帳號資訊
SELECT 
    u.id,
    u.username,
    u.role,
    u.status,
    c.name as company_name,
    c.code as company_code
FROM "user" u
LEFT JOIN company c ON u.company_id = c.id
WHERE u.role IN ('SUPER_ADMIN', 'AGENT_OWNER')
ORDER BY u.id;