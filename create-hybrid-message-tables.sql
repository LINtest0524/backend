-- 混合模式訊息系統 - 重新設計
-- 解決系統廣播造成大量資料的問題

-- 1. 系統廣播表（一則廣播只有一筆記錄）
CREATE TABLE IF NOT EXISTS "system_broadcast" (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL, -- 發送者（管理員）
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    broadcast_type VARCHAR(50) DEFAULT 'GENERAL' CHECK (broadcast_type IN ('GENERAL', 'URGENT', 'MAINTENANCE', 'PROMOTION')),
    target_audience VARCHAR(50) DEFAULT 'ALL' CHECK (target_audience IN ('ALL', 'VIP', 'NEW_USERS')), -- 目標受眾
    is_active BOOLEAN DEFAULT TRUE, -- 是否啟用
    expires_at TIMESTAMP NULL, -- 過期時間（可選）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 個人訊息表（保留原有邏輯，但只用於一對一訊息）
CREATE TABLE IF NOT EXISTS "personal_message" (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    receiver_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL
);

-- 3. 會員最後登入時間記錄（用於判斷未讀廣播）
CREATE TABLE IF NOT EXISTS "user_login_log" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_broadcast_check_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 最後檢查廣播的時間
    UNIQUE(user_id, company_id)
);

-- 4. 廣播統計表（可選 - 用於統計分析）
CREATE TABLE IF NOT EXISTS "broadcast_stats" (
    id SERIAL PRIMARY KEY,
    broadcast_id INTEGER NOT NULL REFERENCES system_broadcast(id) ON DELETE CASCADE,
    total_target_users INTEGER DEFAULT 0, -- 目標會員數
    total_views INTEGER DEFAULT 0, -- 總查看數
    total_clicks INTEGER DEFAULT 0, -- 總點擊數
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(broadcast_id)
);

-- 5. 建立索引
CREATE INDEX IF NOT EXISTS idx_system_broadcast_company_id ON system_broadcast(company_id);
CREATE INDEX IF NOT EXISTS idx_system_broadcast_created_at ON system_broadcast(created_at);
CREATE INDEX IF NOT EXISTS idx_system_broadcast_active ON system_broadcast(is_active);
CREATE INDEX IF NOT EXISTS idx_system_broadcast_expires ON system_broadcast(expires_at);

CREATE INDEX IF NOT EXISTS idx_personal_message_receiver_id ON personal_message(receiver_id);
CREATE INDEX IF NOT EXISTS idx_personal_message_company_id ON personal_message(company_id);
CREATE INDEX IF NOT EXISTS idx_personal_message_is_read ON personal_message(is_read);
CREATE INDEX IF NOT EXISTS idx_personal_message_created_at ON personal_message(created_at);

CREATE INDEX IF NOT EXISTS idx_user_login_log_user_id ON user_login_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_log_company_id ON user_login_log(company_id);

-- 6. 建立觸發器
CREATE OR REPLACE FUNCTION update_broadcast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_broadcast_updated_at_trigger
    BEFORE UPDATE ON system_broadcast
    FOR EACH ROW
    EXECUTE FUNCTION update_broadcast_updated_at();

CREATE OR REPLACE FUNCTION update_personal_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personal_message_updated_at_trigger
    BEFORE UPDATE ON personal_message
    FOR EACH ROW
    EXECUTE FUNCTION update_personal_message_updated_at();

-- 7. 會員登入時更新最後登入時間的函數
CREATE OR REPLACE FUNCTION update_user_login_time(p_user_id INTEGER, p_company_id INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_login_log (user_id, company_id, last_login_at, last_broadcast_check_at)
    VALUES (p_user_id, p_company_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET 
        last_login_at = CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';

-- 8. 更新廣播檢查時間的函數
CREATE OR REPLACE FUNCTION update_broadcast_check_time(p_user_id INTEGER, p_company_id INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_login_log (user_id, company_id, last_broadcast_check_at)
    VALUES (p_user_id, p_company_id, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, company_id) 
    DO UPDATE SET 
        last_broadcast_check_at = CURRENT_TIMESTAMP;
END;
$$ language 'plpgsql';