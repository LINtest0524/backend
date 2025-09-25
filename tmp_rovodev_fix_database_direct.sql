-- 直接在資料庫管理工具中執行的修復腳本

-- 第一部分：檢查並修復表結構
-- 確保 user_tag 表存在且結構正確
CREATE TABLE IF NOT EXISTS user_tag (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 添加外鍵約束（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_tag_user_id_fkey'
    ) THEN
        ALTER TABLE user_tag ADD CONSTRAINT user_tag_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_tag_tag_id_fkey'
    ) THEN
        ALTER TABLE user_tag ADD CONSTRAINT user_tag_tag_id_fkey 
        FOREIGN KEY (tag_id) REFERENCES marquee_tag(id) ON DELETE CASCADE;
    END IF;
    
    -- 添加唯一約束防止重複
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_tag_unique'
    ) THEN
        ALTER TABLE user_tag ADD CONSTRAINT user_tag_unique 
        UNIQUE (user_id, tag_id);
    END IF;
END $$;

-- 第二部分：確保標籤存在
-- 插入標籤 ID 5 和 6（如果不存在）
INSERT INTO marquee_tag (id, name, backgroundColor, textColor, shape, company_id, created_at, updated_at)
VALUES 
    (5, '身分證通過', '#10B981', '#FFFFFF', 'rectangle', 1, NOW(), NOW()),
    (6, '銀行驗證通過', '#3B82F6', '#FFFFFF', 'rectangle', 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    backgroundColor = EXCLUDED.backgroundColor,
    textColor = EXCLUDED.textColor,
    updated_at = NOW();

-- 第三部分：確保自動標籤規則存在
INSERT INTO auto_tag_rules (tag_id, trigger_field, trigger_value, condition_type, description, company_id, is_active, created_at, updated_at)
VALUES 
    (5, 'id_verified', 'true', 'EQUALS', '身分證驗證通過自動添加標籤', 1, true, NOW(), NOW()),
    (6, 'bank_verified', 'true', 'EQUALS', '銀行驗證通過自動添加標籤', 1, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 第四部分：為已驗證會員補上標籤
-- 為身分證已驗證的會員添加標籤
INSERT INTO user_tag (user_id, tag_id, "createdAt", "updatedAt")
SELECT u.id, 5, NOW(), NOW()
FROM "user" u
WHERE u.id_verified = true 
  AND u.company_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_tag ut 
    WHERE ut.user_id = u.id AND ut.tag_id = 5
  );

-- 為銀行已驗證的會員添加標籤  
INSERT INTO user_tag (user_id, tag_id, "createdAt", "updatedAt")
SELECT u.id, 6, NOW(), NOW()
FROM "user" u
WHERE u.bank_verified = true 
  AND u.company_id = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_tag ut 
    WHERE ut.user_id = u.id AND ut.tag_id = 6
  );

-- 第五部分：檢查會員 ttt111 的狀態
SELECT 
    u.id as 會員ID,
    u.username as 會員帳號,
    u.id_verified as 身分證驗證,
    u.bank_verified as 銀行驗證,
    u.company_id as 公司ID,
    COUNT(ut.id) as 標籤數量
FROM "user" u
LEFT JOIN user_tag ut ON u.id = ut.user_id
WHERE u.username = 'ttt111'
GROUP BY u.id, u.username, u.id_verified, u.bank_verified, u.company_id;

-- 查看會員 ttt111 的所有標籤
SELECT 
    u.username as 會員帳號,
    mt.id as 標籤ID,
    mt.name as 標籤名稱,
    mt.backgroundColor as 背景色,
    ut."createdAt" as 創建時間
FROM "user" u
JOIN user_tag ut ON u.id = ut.user_id
JOIN marquee_tag mt ON ut.tag_id = mt.id
WHERE u.username = 'ttt111'
ORDER BY ut."createdAt";

-- 檢查所有自動標籤規則
SELECT 
    atr.id as 規則ID,
    atr.tag_id as 標籤ID,
    mt.name as 標籤名稱,
    atr.trigger_field as 觸發欄位,
    atr.trigger_value as 觸發值,
    atr.condition_type as 條件類型,
    atr.is_active as 是否啟用,
    atr.description as 描述
FROM auto_tag_rules atr
LEFT JOIN marquee_tag mt ON atr.tag_id = mt.id
WHERE atr.company_id = 1 OR atr.company_id IS NULL
ORDER BY atr.id;