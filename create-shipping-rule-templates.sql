-- 建立運費方案模板表
CREATE TABLE shipping_rule_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立運費方案詳細規則表
CREATE TABLE shipping_rule_template_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES shipping_rule_templates(id) ON DELETE CASCADE,
    method VARCHAR(255) NOT NULL,
    base_fee DECIMAL(10,2) NOT NULL,
    free_shipping_threshold DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 為產品表添加運費方案欄位
ALTER TABLE products ADD COLUMN shipping_rule_template_id INTEGER REFERENCES shipping_rule_templates(id);

-- 插入預設運費方案
INSERT INTO shipping_rule_templates (name, description, is_default, company_id) VALUES 
('運送規則1', '一般商品運送方案', TRUE, 1);

-- 取得剛插入的模板ID
DO $$
DECLARE
    template_id INTEGER;
BEGIN
    SELECT id INTO template_id FROM shipping_rule_templates WHERE name = '運送規則1' AND company_id = 1;
    
    -- 插入運費規則詳細項目
    INSERT INTO shipping_rule_template_items (template_id, method, base_fee, free_shipping_threshold, sort_order) VALUES 
    (template_id, '7-11超商取貨', 60.00, 399.00, 1),
    (template_id, '宅配', 210.00, 5000.00, 2);
END $$;

-- 插入其他運費方案
INSERT INTO shipping_rule_templates (name, description, is_default, company_id) VALUES 
('運送規則2', '大型貨物運送方案', FALSE, 1),
('運送規則3', '低溫宅配運送方案', FALSE, 1);

-- 為運送規則2添加項目
DO $$
DECLARE
    template_id INTEGER;
BEGIN
    SELECT id INTO template_id FROM shipping_rule_templates WHERE name = '運送規則2' AND company_id = 1;
    
    INSERT INTO shipping_rule_template_items (template_id, method, base_fee, free_shipping_threshold, sort_order) VALUES 
    (template_id, '大型貨物(限宅配)', 210.00, 5000.00, 1);
END $$;

-- 為運送規則3添加項目
DO $$
DECLARE
    template_id INTEGER;
BEGIN
    SELECT id INTO template_id FROM shipping_rule_templates WHERE name = '運送規則3' AND company_id = 1;
    
    INSERT INTO shipping_rule_template_items (template_id, method, base_fee, free_shipping_threshold, sort_order) VALUES 
    (template_id, '低溫宅配', 190.00, 1000.00, 1);
END $$;

-- 為現有產品設定預設運費方案
UPDATE products SET shipping_rule_template_id = (
    SELECT id FROM shipping_rule_templates WHERE is_default = TRUE AND company_id = 1 LIMIT 1
) WHERE shipping_rule_template_id IS NULL;