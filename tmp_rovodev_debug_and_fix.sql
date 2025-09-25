-- 詳細檢查和修復自動標籤問題

-- 第一步：檢查最新通過驗證的會員
SELECT 
    u.id as user_id,
    u.username,
    u.company_id,
    u.id_verified,
    u.id_verified_at,
    iv.id as verification_id,
    iv.status as verification_status,
    iv."updatedAt" as verification_updated
FROM "user" u
LEFT JOIN identity_verification iv ON u.id = iv."userId" AND iv.type = 'ID_CARD'
WHERE u.id_verified = true
ORDER BY u.id_verified_at DESC NULLS LAST
LIMIT 5;

-- 第二步：檢查標籤 ID 5 是否存在，如果不存在就創建
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM marquee_tag WHERE id = 5) THEN
        INSERT INTO marquee_tag (id, name, backgroundColor, textColor, shape, company_id, created_at, updated_at)
        VALUES (5, '身分證通過', '#10B981', '#FFFFFF', 'rectangle', 1, NOW(), NOW());
        RAISE NOTICE '✅ 創建了標籤 ID 5: 身分證通過';
    ELSE
        RAISE NOTICE '✅ 標籤 ID 5 已存在';
        -- 顯示現有標籤資訊
        PERFORM pg_notify('debug', 'Tag 5: ' || (SELECT name FROM marquee_tag WHERE id = 5));
    END IF;
END $$;

-- 第三步：檢查自動標籤規則是否存在，如果不存在就創建
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auto_tag_rules WHERE tag_id = 5 AND trigger_field = 'id_verified') THEN
        INSERT INTO auto_tag_rules (tag_id, trigger_field, trigger_value, condition_type, description, company_id, is_active, created_at, updated_at)
        VALUES (5, 'id_verified', 'true', 'EQUALS', '身分證驗證通過自動添加標籤', 1, true, NOW(), NOW());
        RAISE NOTICE '✅ 創建了自動標籤規則: id_verified -> 標籤 5';
    ELSE
        RAISE NOTICE '✅ 自動標籤規則已存在';
    END IF;
END $$;

-- 第四步：檢查哪些會員應該有標籤但沒有
WITH should_have_tags AS (
    SELECT 
        u.id as user_id,
        u.username,
        u.company_id,
        5 as tag_id
    FROM "user" u
    WHERE u.id_verified = true 
    AND u.company_id = 1
),
current_tags AS (
    SELECT 
        ut.user_id,
        ut.tag_id
    FROM user_tag ut
    WHERE ut.tag_id = 5
)
SELECT 
    sht.user_id,
    sht.username,
    '缺少標籤 5' as 狀態
FROM should_have_tags sht
LEFT JOIN current_tags ct ON sht.user_id = ct.user_id AND sht.tag_id = ct.tag_id
WHERE ct.user_id IS NULL;

-- 第五步：為缺少標籤的會員補上標籤
WITH should_have_tags AS (
    SELECT 
        u.id as user_id,
        5 as tag_id
    FROM "user" u
    WHERE u.id_verified = true 
    AND u.company_id = 1
),
current_tags AS (
    SELECT 
        ut.user_id,
        ut.tag_id
    FROM user_tag ut
    WHERE ut.tag_id = 5
)
INSERT INTO user_tag (user_id, tag_id, "createdAt", "updatedAt")
SELECT 
    sht.user_id,
    sht.tag_id,
    NOW(),
    NOW()
FROM should_have_tags sht
LEFT JOIN current_tags ct ON sht.user_id = ct.user_id AND sht.tag_id = ct.tag_id
WHERE ct.user_id IS NULL;

-- 第六步：檢查修復結果
SELECT 
    u.username as 會員帳號,
    u.id_verified as 身分證驗證,
    mt.id as 標籤ID,
    mt.name as 標籤名稱,
    ut."createdAt" as 標籤創建時間
FROM "user" u
LEFT JOIN user_tag ut ON u.id = ut.user_id
LEFT JOIN marquee_tag mt ON ut.tag_id = mt.id
WHERE u.id_verified = true
ORDER BY u.username, mt.id;

-- 第七步：檢查自動標籤規則的詳細資訊
SELECT 
    atr.id as 規則ID,
    atr.tag_id as 標籤ID,
    mt.name as 標籤名稱,
    atr.trigger_field as 觸發欄位,
    atr.trigger_value as 觸發值,
    atr.condition_type as 條件類型,
    atr.is_active as 是否啟用,
    atr.company_id as 公司ID,
    atr.description as 描述
FROM auto_tag_rules atr
LEFT JOIN marquee_tag mt ON atr.tag_id = mt.id
ORDER BY atr.id;