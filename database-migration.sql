-- Facebook 登入功能資料庫遷移腳本
-- 為 users 表新增 Facebook 相關欄位

ALTER TABLE users ADD COLUMN facebook_id VARCHAR(255) NULL COMMENT 'Facebook 用戶 ID';
ALTER TABLE users ADD COLUMN first_name VARCHAR(255) NULL COMMENT '名字';
ALTER TABLE users ADD COLUMN last_name VARCHAR(255) NULL COMMENT '姓氏';
ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL COMMENT '頭像 URL';

-- 為 Facebook ID 建立索引以提升查詢效能
CREATE INDEX idx_users_facebook_id ON users(facebook_id);

-- 檢查新增的欄位
DESCRIBE users;