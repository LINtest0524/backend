-- 創建優惠活動相關表

-- 活動類型表
CREATE TABLE promotion_category (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
);

-- 優惠活動表
CREATE TABLE promotion (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  category_id INTEGER,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  image_url VARCHAR(500),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES promotion_category(id) ON DELETE SET NULL
);

-- 創建索引
CREATE INDEX idx_promotion_category_company_id ON promotion_category(company_id);
CREATE INDEX idx_promotion_category_active ON promotion_category(is_active);
CREATE INDEX idx_promotion_company_id ON promotion(company_id);
CREATE INDEX idx_promotion_category_id ON promotion(category_id);
CREATE INDEX idx_promotion_active ON promotion(is_active);
CREATE INDEX idx_promotion_dates ON promotion(start_date, end_date);

-- 插入默認活動類型（可選）
INSERT INTO promotion_category (company_id, name, description, sort_order) VALUES 
(1, '限時優惠', '限時特價活動', 1),
(1, '新品推廣', '新產品推廣活動', 2),
(1, '會員專享', '會員專屬優惠', 3),
(1, '節日活動', '節日特別活動', 4);