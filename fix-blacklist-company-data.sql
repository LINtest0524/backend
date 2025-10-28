-- 修復黑名單表的公司資料隔離
-- company_id 欄位已存在，只需要修復資料和約束

-- 檢查當前的黑名單記錄
SELECT id, userId, email, ip, reason, company_id, created_at 
FROM blacklist 
ORDER BY created_at DESC;

-- 為沒有 company_id 的記錄設定預設值（假設是公司 1）
UPDATE blacklist 
SET company_id = 1 
WHERE company_id IS NULL;

-- 檢查是否已有外鍵約束（如果報錯表示約束已存在，可以忽略）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_blacklist_company'
    ) THEN
        ALTER TABLE blacklist ADD CONSTRAINT fk_blacklist_company 
            FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
END $$;

-- 確認修復結果
SELECT 
    id, 
    COALESCE(userId::text, 'N/A') as user_id,
    COALESCE(email, 'N/A') as email,
    COALESCE(ip, 'N/A') as ip,
    COALESCE(reason, 'N/A') as reason,
    company_id,
    created_at 
FROM blacklist 
ORDER BY company_id, created_at DESC;