-- 創建站內信相關表格

-- 1. 創建站內信表格
CREATE TABLE IF NOT EXISTS "message" (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    receiver_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    message_type VARCHAR(50) DEFAULT 'USER' CHECK (message_type IN ('SYSTEM', 'USER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL
);

-- 2. 創建索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_message_receiver_id ON "message"(receiver_id);
CREATE INDEX IF NOT EXISTS idx_message_company_id ON "message"(company_id);
CREATE INDEX IF NOT EXISTS idx_message_is_read ON "message"(is_read);
CREATE INDEX IF NOT EXISTS idx_message_created_at ON "message"(created_at);
CREATE INDEX IF NOT EXISTS idx_message_receiver_read ON "message"(receiver_id, is_read);

-- 3. 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_updated_at_trigger
    BEFORE UPDATE ON "message"
    FOR EACH ROW
    EXECUTE FUNCTION update_message_updated_at();

-- 4. 插入一些測試資料（系統消息）
INSERT INTO "message" (sender_id, receiver_id, company_id, title, content, message_type) 
SELECT 
    NULL as sender_id,
    u.id as receiver_id,
    u.company_id,
    '歡迎加入我們的平台！' as title,
    '親愛的用戶，歡迎您加入我們的平台！如果您有任何問題，請隨時聯繫客服。' as content,
    'SYSTEM' as message_type
FROM "user" u 
WHERE u.role = 'PORTAL_USER' AND u.company_id IS NOT NULL
ON CONFLICT DO NOTHING;