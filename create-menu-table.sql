-- 建立選單表
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500),
    target_blank BOOLEAN DEFAULT false,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    device_type VARCHAR(20) DEFAULT 'both' CHECK (device_type IN ('desktop', 'mobile', 'both')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引
CREATE INDEX idx_menus_company_id ON menus(company_id);
CREATE INDEX idx_menus_parent_id ON menus(parent_id);
CREATE INDEX idx_menus_sort_order ON menus(sort_order);
CREATE INDEX idx_menus_status ON menus(status);
CREATE INDEX idx_menus_device_type ON menus(device_type);

-- 建立觸發器自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_menus_updated_at 
    BEFORE UPDATE ON menus 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入一些範例資料（可選）
-- 假設公司 ID 1 是 'a' 公司
INSERT INTO menus (company_id, title, url, sort_order, device_type) VALUES
(1, '首頁', '/', 1, 'both'),
(1, '產品介紹', '/products', 2, 'both'),
(1, '關於我們', '/about', 3, 'both'),
(1, '聯絡我們', '/contact', 4, 'both');

-- 插入二級選單範例
INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type) VALUES
(1, 2, '貸款產品', '/products/loans', 1, 'both'),
(1, 2, '投資產品', '/products/investments', 2, 'both');

-- 插入三級選單範例
INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type) VALUES
(1, 5, '個人貸款', '/products/loans/personal', 1, 'both'),
(1, 5, '房屋貸款', '/products/loans/mortgage', 2, 'both');