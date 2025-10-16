-- 簽到活動系統資料表遷移
-- 執行時間：建議在系統維護時間執行

-- 1. 建立活動類型枚舉
DO $$ BEGIN
    CREATE TYPE activity_type_enum AS ENUM (
        'STRICT_STREAK_7',
        'FLEX_CUMULATIVE',
        'DAILY_CALENDAR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 建立獎勵類型枚舉
DO $$ BEGIN
    CREATE TYPE reward_type_enum AS ENUM (
        'CASH',
        'POINTS',
        'COUPON',
        'ITEM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. 建立簽到活動主表
CREATE TABLE IF NOT EXISTS checkin_activity (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    activity_type activity_type_enum NOT NULL,
    days INTEGER NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    publish_at TIMESTAMP NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    company_id INTEGER NULL,
    config_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 建立日次獎勵表
CREATE TABLE IF NOT EXISTS checkin_day_reward (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL,
    day_index INTEGER NOT NULL,
    reward_type reward_type_enum NOT NULL,
    amount INTEGER NULL,
    meta_json JSONB DEFAULT '{}',
    CONSTRAINT fk_day_reward_activity 
        FOREIGN KEY (activity_id) 
        REFERENCES checkin_activity(id) 
        ON DELETE CASCADE,
    CONSTRAINT uk_day_reward_activity_day 
        UNIQUE (activity_id, day_index)
);

-- 5. 建立用戶進度表
CREATE TABLE IF NOT EXISTS checkin_progress (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    last_checkin_date DATE NULL,
    current_streak INTEGER DEFAULT 0,
    total_checked INTEGER DEFAULT 0,
    claimed_days_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_progress_activity 
        FOREIGN KEY (activity_id) 
        REFERENCES checkin_activity(id) 
        ON DELETE CASCADE,
    CONSTRAINT uk_progress_activity_user 
        UNIQUE (activity_id, user_id)
);

-- 6. 建立發獎紀錄表
CREATE TABLE IF NOT EXISTS checkin_ledger (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reward_type reward_type_enum NOT NULL,
    amount INTEGER NULL,
    meta_json JSONB DEFAULT '{}',
    day_index INTEGER NULL,
    tier_days_required INTEGER NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_activity 
        FOREIGN KEY (activity_id) 
        REFERENCES checkin_activity(id) 
        ON DELETE CASCADE
);

-- 7. 建立唯一索引（防重領）
CREATE UNIQUE INDEX IF NOT EXISTS uk_ledger_day_reward 
    ON checkin_ledger (user_id, activity_id, day_index) 
    WHERE day_index IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_ledger_tier_reward 
    ON checkin_ledger (user_id, activity_id, tier_days_required) 
    WHERE tier_days_required IS NOT NULL;

-- 8. 建立其他查詢索引
CREATE INDEX IF NOT EXISTS idx_checkin_activity_type 
    ON checkin_activity (activity_type);

CREATE INDEX IF NOT EXISTS idx_checkin_activity_enabled 
    ON checkin_activity (is_enabled);

CREATE INDEX IF NOT EXISTS idx_checkin_activity_company 
    ON checkin_activity (company_id);

CREATE INDEX IF NOT EXISTS idx_checkin_activity_dates 
    ON checkin_activity (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_checkin_progress_user 
    ON checkin_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_checkin_progress_activity 
    ON checkin_progress (activity_id);

CREATE INDEX IF NOT EXISTS idx_checkin_ledger_user 
    ON checkin_ledger (user_id);

CREATE INDEX IF NOT EXISTS idx_checkin_ledger_activity 
    ON checkin_ledger (activity_id);

CREATE INDEX IF NOT EXISTS idx_checkin_ledger_issued 
    ON checkin_ledger (issued_at);

-- 9. 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_checkin_activity_updated_at ON checkin_activity;
CREATE TRIGGER update_checkin_activity_updated_at 
    BEFORE UPDATE ON checkin_activity 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checkin_progress_updated_at ON checkin_progress;
CREATE TRIGGER update_checkin_progress_updated_at 
    BEFORE UPDATE ON checkin_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. 新增註解
COMMENT ON TABLE checkin_activity IS '簽到活動主表';
COMMENT ON COLUMN checkin_activity.activity_type IS '活動類型：STRICT_STREAK_7=嚴格連續, STREAK_TIERED=連續檔次, FLEX_CUMULATIVE=期間累積, DAILY_CALENDAR=每日簽到';
COMMENT ON COLUMN checkin_activity.days IS '活動天數（日次類型必填）';
COMMENT ON COLUMN checkin_activity.config_json IS '活動配置JSON（存放門檻設定等）';

COMMENT ON TABLE checkin_day_reward IS '日次獎勵配置表';
COMMENT ON COLUMN checkin_day_reward.day_index IS '第幾天（1-N）';

COMMENT ON TABLE checkin_progress IS '用戶簽到進度表';
COMMENT ON COLUMN checkin_progress.current_streak IS '當前連續天數';
COMMENT ON COLUMN checkin_progress.total_checked IS '總累積天數';
COMMENT ON COLUMN checkin_progress.claimed_days_json IS '已領取日期JSON（DAILY類型使用）';

COMMENT ON TABLE checkin_ledger IS '發獎紀錄表';
COMMENT ON COLUMN checkin_ledger.day_index IS '日次獎勵對應天數';
COMMENT ON COLUMN checkin_ledger.tier_days_required IS '門檻獎勵對應天數';

-- 完成
SELECT 'Checkin tables created successfully!' as result;