-- 創建優惠碼相關資料表

-- 1. 優惠碼模板表
CREATE TABLE coupon_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('PUBLIC', 'BATCH')),
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  usage_limit INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 優惠碼實例表
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES coupon_templates(id),
  code VARCHAR(50) NOT NULL UNIQUE,
  assigned_user_id INTEGER,
  is_used BOOLEAN DEFAULT false,
  used_by INTEGER,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 使用記錄表
CREATE TABLE coupon_usage_logs (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  discount_amount DECIMAL(10,2) NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  final_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_coupon_templates_company_id ON coupon_templates(company_id);
CREATE INDEX idx_coupon_templates_type ON coupon_templates(type);
CREATE INDEX idx_coupon_templates_is_active ON coupon_templates(is_active);

CREATE INDEX idx_coupons_template_id ON coupons(template_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_assigned_user_id ON coupons(assigned_user_id);
CREATE INDEX idx_coupons_is_used ON coupons(is_used);

CREATE INDEX idx_coupon_usage_logs_coupon_id ON coupon_usage_logs(coupon_id);
CREATE INDEX idx_coupon_usage_logs_user_id ON coupon_usage_logs(user_id);
CREATE INDEX idx_coupon_usage_logs_order_id ON coupon_usage_logs(order_id);

-- 註釋說明
COMMENT ON TABLE coupon_templates IS '優惠碼模板表';
COMMENT ON TABLE coupons IS '優惠碼實例表';
COMMENT ON TABLE coupon_usage_logs IS '優惠碼使用記錄表';

COMMENT ON COLUMN coupon_templates.type IS '優惠碼類型：PUBLIC=公共優惠碼, BATCH=批量優惠碼';
COMMENT ON COLUMN coupon_templates.discount_type IS '折扣類型：PERCENTAGE=百分比, FIXED=固定金額';
COMMENT ON COLUMN coupon_templates.discount_value IS '折扣值：百分比時為折扣百分比(如10表示10%off)，固定金額時為減免金額';
COMMENT ON COLUMN coupon_templates.min_amount IS '最低消費金額限制';
COMMENT ON COLUMN coupon_templates.max_discount IS '最大折扣金額限制(百分比折扣專用)';
COMMENT ON COLUMN coupon_templates.usage_limit IS '使用次數限制(PUBLIC類型專用)';

COMMENT ON COLUMN coupons.code IS '優惠碼：8位英數混合，格式如VF24A3K8';
COMMENT ON COLUMN coupons.assigned_user_id IS '指定用戶ID：BATCH類型專用，NULL表示PUBLIC類型';