-- 檢查會員 ttt111 的詳細狀態

-- 1. 檢查會員 ttt111 的基本資訊
SELECT 
    id, username, company_id, id_verified, id_verified_at, bank_verified
FROM "user" 
WHERE username = 'ttt111';

-- 2. 檢查標籤 5 是否存在
SELECT id, name, "companyId" FROM marquee_tag WHERE id = 5;

-- 3. 檢查自動標籤規則
SELECT 
    id, tag_id, trigger_field, trigger_value, condition_type, is_active, company_id
FROM auto_tag_rules 
WHERE trigger_field = 'id_verified' AND is_active = true;

-- 4. 檢查會員 ttt111 的所有標籤
SELECT 
    ut.id, ut.user_id, ut.tag_id, mt.name as tag_name, ut."createdAt"
FROM user_tag ut
LEFT JOIN "user" u ON ut.user_id = u.id
LEFT JOIN marquee_tag mt ON ut.tag_id = mt.id
WHERE u.username = 'ttt111';

-- 5. 如果會員 ttt111 沒有標籤 5，手動添加
INSERT INTO user_tag (user_id, tag_id, "createdAt", "updatedAt")
SELECT u.id, 5, NOW(), NOW()
FROM "user" u
WHERE u.username = 'ttt111'
  AND NOT EXISTS (
    SELECT 1 FROM user_tag ut 
    WHERE ut.user_id = u.id AND ut.tag_id = 5
  );

-- 6. 再次檢查會員 ttt111 的標籤
SELECT 
    u.username,
    ut.tag_id,
    mt.name as tag_name,
    ut."createdAt" as tag_created_at
FROM user_tag ut
JOIN "user" u ON ut.user_id = u.id
JOIN marquee_tag mt ON ut.tag_id = mt.id
WHERE u.username = 'ttt111'
ORDER BY ut."createdAt";