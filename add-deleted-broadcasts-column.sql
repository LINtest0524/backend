-- 添加已刪除廣播ID列表字段到 user_login_log 表
ALTER TABLE user_login_log 
ADD COLUMN deleted_broadcast_ids TEXT DEFAULT '[]';

-- 添加註釋
COMMENT ON COLUMN user_login_log.deleted_broadcast_ids IS '已刪除的廣播ID列表，JSON格式存儲';