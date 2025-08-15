-- 創建彈窗公告表
CREATE TABLE popup_announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  desktop_image_url VARCHAR(500),
  mobile_image_url VARCHAR(500),
  button_text VARCHAR(100),
  button_url VARCHAR(500),
  sort_order INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  company_code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
CREATE INDEX idx_company_status ON popup_announcements (company_code, status);
CREATE INDEX idx_sort_order ON popup_announcements (sort_order DESC);
CREATE INDEX idx_date_range ON popup_announcements (start_date, end_date);

-- 創建用戶彈窗公告查看記錄表
CREATE TABLE user_popup_views (
  id SERIAL PRIMARY KEY,
  user_id INT,
  session_id VARCHAR(100),
  popup_announcement_id INT NOT NULL,
  company_code VARCHAR(10) NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hide_today BOOLEAN DEFAULT FALSE,
  hide_date DATE,
  FOREIGN KEY (popup_announcement_id) REFERENCES popup_announcements(id) ON DELETE CASCADE
);

-- 創建索引
CREATE INDEX idx_user_company ON user_popup_views (user_id, company_code);
CREATE INDEX idx_session_company ON user_popup_views (session_id, company_code);
CREATE INDEX idx_hide_date ON user_popup_views (hide_date);