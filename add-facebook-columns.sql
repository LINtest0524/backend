-- 檢查並新增 Facebook 登入所需的欄位
-- 請在您的資料庫中執行這些 SQL 語句

-- 檢查現有的 users 表結構
DESCRIBE users;

-- 新增 Facebook 相關欄位（如果不存在的話）
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) NULL COMMENT 'Facebook 用戶 ID';
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) NULL COMMENT '名字';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) NULL COMMENT '姓氏';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255) NULL COMMENT '頭像 URL';

-- 為 Facebook ID 建立索引
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);

-- 再次檢查表結構確認欄位已新增
DESCRIBE users;