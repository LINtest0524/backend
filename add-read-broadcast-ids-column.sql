-- 添加 read_broadcast_ids 欄位到 user_login_log 表
ALTER TABLE user_login_log 
ADD COLUMN read_broadcast_ids TEXT DEFAULT '[]';

-- 為現有記錄設置默認值
UPDATE user_login_log 
SET read_broadcast_ids = '[]' 
WHERE read_broadcast_ids IS NULL;