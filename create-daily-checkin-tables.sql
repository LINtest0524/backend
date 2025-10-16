-- 每日簽到獎勵配置表
CREATE TABLE IF NOT EXISTS daily_checkin_configs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL, -- 第幾天 (1-7 或更多)
    reward_type VARCHAR(20) NOT NULL DEFAULT 'points', -- 獎勵類型: points(點數), cash(現金), coupon(優惠券)
    reward_value INTEGER NOT NULL DEFAULT 0, -- 獎勵數值
    reward_description VARCHAR(255), -- 獎勵描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(company_id, day_number)
);

-- 用戶簽到記錄表
CREATE TABLE IF NOT EXISTS user_daily_checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    day_number INTEGER NOT NULL, -- 連續簽到第幾天
    reward_type VARCHAR(20) NOT NULL,
    reward_value INTEGER NOT NULL,
    reward_description VARCHAR(255),
    is_received BOOLEAN DEFAULT true, -- 是否已領取獎勵
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(user_id, company_id, checkin_date)
);

-- 用戶簽到狀態表 (記錄當前連續簽到狀態)
CREATE TABLE IF NOT EXISTS user_checkin_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    consecutive_days INTEGER DEFAULT 0, -- 連續簽到天數
    last_checkin_date DATE, -- 最後簽到日期
    total_checkins INTEGER DEFAULT 0, -- 總簽到次數
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(user_id, company_id)
);

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_daily_checkin_configs_company ON daily_checkin_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_checkins_user_company ON user_daily_checkins(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_checkins_date ON user_daily_checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_user_checkin_status_user_company ON user_checkin_status(user_id, company_id);

-- 插入預設的7日簽到獎勵配置 (company_id = 1 的範例)
INSERT INTO daily_checkin_configs (company_id, day_number, reward_type, reward_value, reward_description) VALUES
(1, 1, 'points', 10, '簽到第1天獎勵'),
(1, 2, 'points', 20, '簽到第2天獎勵'),
(1, 3, 'points', 30, '簽到第3天獎勵'),
(1, 4, 'points', 50, '簽到第4天獎勵'),
(1, 5, 'cash', 100, '簽到第5天獎勵'),
(1, 6, 'points', 80, '簽到第6天獎勵'),
(1, 7, 'cash', 200, '簽到第7天大獎')
ON CONFLICT (company_id, day_number) DO NOTHING;