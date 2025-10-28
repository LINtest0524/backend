-- 為黑名單表添加 company_id 欄位以實現公司隔離
ALTER TABLE blacklist ADD COLUMN company_id INTEGER;

-- 添加外鍵約束
ALTER TABLE blacklist ADD CONSTRAINT fk_blacklist_company 
    FOREIGN KEY (company_id) REFERENCES companies(id);

-- 為現有的黑名單記錄設定預設公司 (假設是公司 1)
UPDATE blacklist SET company_id = 1 WHERE company_id IS NULL;

-- 查看結果
SELECT id, userId, email, ip, reason, company_id, created_at 
FROM blacklist 
ORDER BY company_id, created_at DESC;