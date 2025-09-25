-- 最終修復腳本 - 使用正確的欄位名稱

-- 1. 先檢查 marquee_tag 表的結構
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'marquee_tag' 
ORDER BY ordinal_position;

-- 2. 檢查會員 ttt111 的狀態
SELECT 
    id, username, company_id, id_verified, id_verified_at
FROM "user" 
WHERE username = 'ttt111';

-- 3. 檢查現有的標籤（找最大的 ID）
SELECT id, name FROM marquee_tag ORDER BY id DESC LIMIT 5;

-- 4. 檢查自動標籤規則表
SELECT * FROM auto_tag_rules WHERE trigger_field = 'id_verified';

-- 5. 創建標籤（使用動態 ID，避免衝突）
DO $$
DECLARE
    new_tag_id INTEGER;
    existing_tag_id INTEGER;
BEGIN
    -- 檢查是否已經有身分證通過的標籤
    SELECT id INTO existing_tag_id 
    FROM marquee_tag 
    WHERE name = '身分證通過';
    
    IF existing_tag_id IS NULL THEN
        -- 沒有的話就創建新的
        SELECT COALESCE(MAX(id), 0) + 1 INTO new_tag_id FROM marquee_tag;
        
        INSERT INTO marquee_tag (id, name, "backgroundColor", "textColor", shape, "isActive", "companyId", "createdAt", "updatedAt")
        VALUES (new_tag_id, '身分證通過', '#10B981', '#FFFFFF', 'rectangle', true, 1, NOW(), NOW());
        
        RAISE NOTICE '✅ 創建了標籤 ID %: 身分證通過', new_tag_id;
        
        -- 創建對應的自動標籤規則
        INSERT INTO auto_tag_rules (tag_id, trigger_field, trigger_value, condition_type, description, company_id, is_active, created_at, updated_at)
        VALUES (new_tag_id, 'id_verified', 'true', 'EQUALS', '身分證驗證通過自動添加標籤', 1, true, NOW(), NOW());
        
        RAISE NOTICE '✅ 創建了自動標籤規則: id_verified -> 標籤 %', new_tag_id;
    ELSE
        new_tag_id := existing_tag_id;
        RAISE NOTICE '✅ 標籤已存在 ID %: 身分證通過', new_tag_id;
        
        -- 確保有對應的自動標籤規則
        INSERT INTO auto_tag_rules (tag_id, trigger_field, trigger_value, condition_type, description, company_id, is_active, created_at, updated_at)
        VALUES (new_tag_id, 'id_verified', 'true', 'EQUALS', '身分證驗證通過自動添加標籤', 1, true, NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- 為會員 ttt111 添加標籤（如果還沒有的話）
    INSERT INTO user_tag (user_id, tag_id, "createdAt", "updatedAt")
    SELECT u.id, new_tag_id, NOW(), NOW()
    FROM "user" u
    WHERE u.username = 'ttt111'
      AND u.id_verified = true
      AND NOT EXISTS (
        SELECT 1 FROM user_tag ut 
        WHERE ut.user_id = u.id AND ut.tag_id = new_tag_id
      );
    
    -- 顯示結果
    RAISE NOTICE '=== 最終狀態 ===';
    PERFORM pg_notify('debug', 'Tag ID: ' || new_tag_id::text);
END $$;

-- 6. 檢查最終結果
SELECT 
    u.username as 會員帳號,
    u.id_verified as 身分證驗證,
    ut.tag_id as 標籤ID,
    mt.name as 標籤名稱,
    ut."createdAt" as 標籤創建時間
FROM "user" u
LEFT JOIN user_tag ut ON u.id = ut.user_id
LEFT JOIN marquee_tag mt ON ut.tag_id = mt.id
WHERE u.username = 'ttt111'
ORDER BY ut."createdAt";

-- 7. 顯示所有自動標籤規則
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