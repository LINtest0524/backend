-- 建立聯絡資訊表
CREATE TABLE contact_infos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL COMMENT '標題',
    icon VARCHAR(500) COMMENT 'ICON圖片路徑',
    link VARCHAR(1000) COMMENT '連結網址',
    target_blank BOOLEAN DEFAULT false COMMENT '是否另開新頁',
    qr_code VARCHAR(500) COMMENT 'QR Code圖片路徑',
    sort_order INTEGER DEFAULT 0 COMMENT '排序',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')) COMMENT '狀態',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_contact_infos_company_id ON contact_infos(company_id);
CREATE INDEX idx_contact_infos_sort_order ON contact_infos(sort_order);
CREATE INDEX idx_contact_infos_status ON contact_infos(status);

-- 建立觸發器自動更新 updated_at
CREATE TRIGGER update_contact_infos_updated_at 
    BEFORE UPDATE ON contact_infos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入一些範例資料
INSERT INTO contact_infos (company_id, title, icon, link, target_blank, sort_order, status) VALUES
(1, 'LINE 客服', '', 'https://line.me/ti/p/@example', true, 1, 'active'),
(1, 'Facebook 粉絲團', '', 'https://www.facebook.com/example', true, 2, 'active'),
(1, '客服電話', '', 'tel:+886-2-1234-5678', false, 3, 'active'),
(1, '客服信箱', '', 'mailto:service@example.com', false, 4, 'active');