-- 添加身分證和銀行驗證欄位到 users 表
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMP NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS bank_verified BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMP NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0;

-- 創建自動化標籤規則表
CREATE TABLE IF NOT EXISTS auto_tag_rules (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER REFERENCES marquee_tag(id) ON DELETE CASCADE,
  trigger_field VARCHAR(50) NOT NULL, -- 觸發欄位名稱
  trigger_value VARCHAR(50) NOT NULL, -- 觸發值
  condition_type VARCHAR(20) DEFAULT 'EQUALS', -- 條件類型: EQUALS, GREATER_THAN, NOT_NULL
  is_active BOOLEAN DEFAULT true,
  description VARCHAR(255), -- 規則描述
  company_id INTEGER REFERENCES company(id), -- 所屬公司
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入範例自動化規則
INSERT INTO auto_tag_rules (tag_id, trigger_field, trigger_value, condition_type, description, company_id) VALUES
(5, 'id_verified', 'true', 'EQUALS', '身分證驗證通過自動添加標籤', 1),
(6, 'bank_verified', 'true', 'EQUALS', '銀行驗證通過自動添加標籤', 1);