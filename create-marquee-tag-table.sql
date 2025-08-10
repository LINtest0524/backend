-- 創建跑馬燈標籤表
CREATE TABLE IF NOT EXISTS marquee_tag (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    backgroundColor VARCHAR(7) NOT NULL,
    textColor VARCHAR(7) DEFAULT '#FFFFFF',
    isActive BOOLEAN DEFAULT true,
    companyId INTEGER NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES company(id) ON DELETE CASCADE
);

-- 為跑馬燈表添加標籤關聯欄位
ALTER TABLE marquee ADD COLUMN IF NOT EXISTS tagId INTEGER;
ALTER TABLE marquee ADD CONSTRAINT fk_marquee_tag 
    FOREIGN KEY (tagId) REFERENCES marquee_tag(id) ON DELETE SET NULL;

-- 創建一些預設標籤範例
INSERT INTO marquee_tag (name, backgroundColor, companyId) 
SELECT '重要', '#FF4444', id FROM company 
WHERE NOT EXISTS (
    SELECT 1 FROM marquee_tag 
    WHERE name = '重要' AND companyId = company.id
);

INSERT INTO marquee_tag (name, backgroundColor, companyId) 
SELECT '提醒', '#FFA500', id FROM company 
WHERE NOT EXISTS (
    SELECT 1 FROM marquee_tag 
    WHERE name = '提醒' AND companyId = company.id
);

INSERT INTO marquee_tag (name, backgroundColor, companyId) 
SELECT '通知', '#4CAF50', id FROM company 
WHERE NOT EXISTS (
    SELECT 1 FROM marquee_tag 
    WHERE name = '通知' AND companyId = company.id
);