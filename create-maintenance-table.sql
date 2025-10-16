-- 創建維護管理資料表
CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    title VARCHAR(255) DEFAULT '系統維護中',
    message TEXT,
    estimated_end_time TIMESTAMP,
    contact_info TEXT,
    background_color VARCHAR(7) DEFAULT '#1f2937',
    text_color VARCHAR(7) DEFAULT '#ffffff',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_enabled ON maintenance(is_enabled);

-- 建立唯一約束（每個公司只能有一筆維護設定）
ALTER TABLE maintenance ADD CONSTRAINT unique_company_maintenance 
UNIQUE (company_id);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at();

-- 插入預設資料（可選）
-- INSERT INTO maintenance (company_id, is_enabled, title, message) 
-- VALUES (1, FALSE, '系統維護中', '系統正在進行維護升級，請稍後再試。')
-- ON CONFLICT (company_id) DO NOTHING;