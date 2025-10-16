-- 重新設計每日簽到系統
-- 1. 創建新的活動表
CREATE TABLE IF NOT EXISTS daily_checkin_events (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL, -- 活動名稱：中秋節簽到活動
    description TEXT, -- 活動描述
    start_date TIMESTAMP NOT NULL, -- 活動開始時間
    end_date TIMESTAMP NOT NULL, -- 活動結束時間
    total_days INTEGER NOT NULL DEFAULT 7, -- 總簽到天數
    is_active BOOLEAN DEFAULT true, -- 是否啟用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 2. 創建新的獎勵配置表
CREATE TABLE IF NOT EXISTS daily_checkin_rewards (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL, -- 第幾天 (1, 2, 3...)
    reward_type VARCHAR(20) NOT NULL DEFAULT 'points', -- 獎勵類型: points, cash, coupon
    reward_value INTEGER NOT NULL DEFAULT 0, -- 獎勵數值
    reward_description VARCHAR(255), -- 獎勵描述
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES daily_checkin_events(id) ON DELETE CASCADE,
    UNIQUE(event_id, day_number) -- 同一活動的同一天只能有一個獎勵
);

-- 3. 更新用戶簽到記錄表，關聯到活動
DROP TABLE IF EXISTS user_daily_checkins_new;
CREATE TABLE user_daily_checkins_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    day_number INTEGER NOT NULL, -- 連續簽到第幾天
    reward_type VARCHAR(20) NOT NULL,
    reward_value INTEGER NOT NULL,
    reward_description VARCHAR(255),
    is_received BOOLEAN DEFAULT true, -- 是否已領取獎勵
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES daily_checkin_events(id) ON DELETE CASCADE,
    UNIQUE(user_id, company_id, event_id, checkin_date) -- 同一活動同一天只能簽到一次
);

-- 4. 更新用戶簽到狀態表，關聯到活動
DROP TABLE IF EXISTS user_checkin_status_new;
CREATE TABLE user_checkin_status_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    consecutive_days INTEGER DEFAULT 0, -- 連續簽到天數
    last_checkin_date DATE, -- 最後簽到日期
    total_checkins INTEGER DEFAULT 0, -- 總簽到次數
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES daily_checkin_events(id) ON DELETE CASCADE,
    UNIQUE(user_id, company_id, event_id) -- 每個用戶在每個活動中只有一個狀態記錄
);

-- 5. 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_daily_checkin_events_company ON daily_checkin_events(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkin_events_dates ON daily_checkin_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkin_events_active ON daily_checkin_events(is_active);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_rewards_event ON daily_checkin_rewards(event_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkin_rewards_day ON daily_checkin_rewards(event_id, day_number);

CREATE INDEX IF NOT EXISTS idx_user_daily_checkins_new_user_event ON user_daily_checkins_new(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_checkins_new_date ON user_daily_checkins_new(checkin_date);

CREATE INDEX IF NOT EXISTS idx_user_checkin_status_new_user_event ON user_checkin_status_new(user_id, event_id);

-- 6. 插入範例資料
INSERT INTO daily_checkin_events (company_id, name, description, start_date, end_date, total_days) VALUES
(1, '中秋節簽到活動', '中秋佳節連續簽到送好禮', '2024-09-15 00:00:00', '2024-09-21 23:59:59', 7),
(1, '國慶日簽到活動', '國慶連假每日簽到領獎勵', '2024-10-01 00:00:00', '2024-10-07 23:59:59', 7)
ON CONFLICT DO NOTHING;

-- 7. 插入範例獎勵配置
INSERT INTO daily_checkin_rewards (event_id, day_number, reward_type, reward_value, reward_description) VALUES
-- 中秋節活動獎勵
(1, 1, 'cash', 5, '中秋第1天 - 現金獎勵'),
(1, 2, 'points', 100, '中秋第2天 - 點數獎勵'),
(1, 3, 'cash', 10, '中秋第3天 - 現金獎勵'),
(1, 4, 'points', 200, '中秋第4天 - 點數獎勵'),
(1, 5, 'cash', 15, '中秋第5天 - 現金獎勵'),
(1, 6, 'coupon', 1, '中秋第6天 - 優惠券'),
(1, 7, 'cash', 50, '中秋第7天 - 大獎現金'),
-- 國慶日活動獎勵
(2, 1, 'cash', 10, '國慶第1天 - 現金獎勵'),
(2, 2, 'cash', 15, '國慶第2天 - 現金獎勵'),
(2, 3, 'cash', 20, '國慶第3天 - 現金獎勵'),
(2, 4, 'points', 300, '國慶第4天 - 點數獎勵'),
(2, 5, 'cash', 25, '國慶第5天 - 現金獎勵'),
(2, 6, 'cash', 30, '國慶第6天 - 現金獎勵'),
(2, 7, 'cash', 100, '國慶第7天 - 大獎現金')
ON CONFLICT (event_id, day_number) DO NOTHING;