-- 簡化版自動標籤修復腳本

-- 1. 檢查並創建標籤 ID 5
INSERT INTO marquee_tag (id, name, backgroundColor, textColor, shape, "companyId", "createdAt", "updatedAt")
VALUES (5, '身分證通過', '#10B981', '#FFFFFF', 'rectangle', 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    backgroundColor = EXCLUDED.backgroundColor,
    textColor = EXCLUDED.textColor,
    "updatedAt" = NOW();

-- 2. 檢查並創建自動標籤規則
INSERT INTO auto_tag_rules (tag_id, trigger_field, trigger_value, condition_type, description, company_id, is_active, created_at, updated_at)
VALUES (5, 'id_verified', 'true', 'EQUALS', '身分證驗證通過自動添加標籤', 1, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. 為所有已驗證但沒有標籤的會員補上標籤
INSERT INTO user_tag (user_id, tag_id, "createdAt", "updatedAt")
SELECT u.id, 5, NOW(), NOW()
FROM "user" u
WHERE u.id_verified = true 
  AND u.company_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_tag ut 
    WHERE ut.user_id = u.id AND ut.tag_id = 5
  );

-- 4. 檢查結果 - 顯示所有有身分證驗證的會員及其標籤
SELECT 
    u.id as 會員ID,
    u.username as 會員帳號,
    u.id_verified as 身分證驗證,
    u.company_id as 公司ID,
    COALESCE(tag_info.標籤列表, '無標籤') as 標籤列表
FROM "user" u
LEFT JOIN (
    SELECT 
        ut.user_id,
        STRING_AGG(mt.id || ':' || mt.name, ', ') as 標籤列表
    FROM user_tag ut
    JOIN marquee_tag mt ON ut.tag_id = mt.id
    GROUP BY ut.user_id
) tag_info ON u.id = tag_info.user_id
WHERE u.id_verified = true
ORDER BY u.id;

-- 5. 檢查自動標籤規則
SELECT 
    atr.id as 規則ID,
    atr.tag_id as 標籤ID,
    mt.name as 標籤名稱,
    atr.trigger_field as 觸發欄位,
    atr.trigger_value as 觸發值,
    atr.is_active as 是否啟用,
    atr.company_id as 公司ID
FROM auto_tag_rules atr
LEFT JOIN marquee_tag mt ON atr.tag_id = mt.id
WHERE atr.trigger_field = 'id_verified'
ORDER BY atr.id;