-- 為每日簽到配置表添加活動管理欄位
ALTER TABLE daily_checkin_configs 
ADD COLUMN IF NOT EXISTS activity_name VARCHAR(100), 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP, 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_daily_checkin_configs_activity ON daily_checkin_configs(activity_name);
CREATE INDEX IF NOT EXISTS idx_daily_checkin_configs_dates ON daily_checkin_configs(start_date, end_date);

-- 更新現有的配置，添加預設活動名稱
UPDATE daily_checkin_configs 
SET activity_name = '預設簽到活動' 
WHERE activity_name IS NULL;