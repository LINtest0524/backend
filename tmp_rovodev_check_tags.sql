-- 檢查自動標籤系統的設置

-- 1. 檢查標籤 ID 5 是否存在
SELECT id, name, backgroundColor, textColor, company_id 
FROM marquee_tag 
WHERE id = 5;

-- 2. 檢查自動標籤規則是否存在
SELECT 
    atr.id as 規則ID,
    atr.tag_id as 標籤ID,
    mt.name as 標籤名稱,
    atr.trigger_field as 觸發欄位,
    atr.trigger_value as 觸發值,
    atr.condition_type as 條件類型,
    atr.is_active as 是否啟用,
    atr.company_id as 公司ID
FROM auto_tag_rules atr
LEFT JOIN marquee_tag mt ON atr.tag_id = mt.id
WHERE atr.trigger_field = 'id_verified'
ORDER BY atr.id;

-- 3. 檢查最近通過身分證驗證的會員
SELECT 
    u.id as 會員ID,
    u.username as 會員帳號,
    u.id_verified as 身分證驗證,
    u.id_verified_at as 驗證時間,
    u.company_id as 公司ID,
    COUNT(ut.id) as 目前標籤數量
FROM "user" u
LEFT JOIN user_tag ut ON u.id = ut.user_id
WHERE u.id_verified = true
GROUP BY u.id, u.username, u.id_verified, u.id_verified_at, u.company_id
ORDER BY u.id_verified_at DESC NULLS LAST
LIMIT 10;

-- 4. 檢查最近的身分證驗證申請記錄
SELECT 
    iv.id as 驗證ID,
    iv.userId as 會員ID,
    u.username as 會員帳號,
    iv.type as 驗證類型,
    iv.status as 狀態,
    iv.createdAt as 申請時間,
    iv.updatedAt as 更新時間
FROM identity_verification iv
LEFT JOIN "user" u ON iv.userId = u.id
WHERE iv.type = 'ID_CARD'
ORDER BY iv.updatedAt DESC
LIMIT 10;

-- 5. 檢查會員 tag_id = 2 的情況
SELECT 
    u.username as 會員帳號,
    ut.tag_id as 標籤ID,
    mt.name as 標籤名稱,
    ut."createdAt" as 創建時間
FROM user_tag ut
LEFT JOIN "user" u ON ut.user_id = u.id
LEFT JOIN marquee_tag mt ON ut.tag_id = mt.id
WHERE ut.tag_id = 2
ORDER BY ut."createdAt" DESC;