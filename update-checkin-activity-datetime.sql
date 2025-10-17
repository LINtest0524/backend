-- 更新簽到活動表的日期欄位，支援時分秒
-- 將 start_date 和 end_date 從 date 類型改為 timestamp 類型

-- 1. 先備份現有資料
CREATE TABLE IF NOT EXISTS checkin_activity_backup AS 
SELECT * FROM checkin_activity;

-- 2. 先處理 NULL 值問題
-- 將 NULL 的 start_date 設為今天
UPDATE checkin_activity 
SET start_date = CURRENT_DATE 
WHERE start_date IS NULL;

-- 將 NULL 的 end_date 設為明天
UPDATE checkin_activity 
SET end_date = CURRENT_DATE + INTERVAL '1 day'
WHERE end_date IS NULL;

-- 3. 新增臨時的 timestamp 欄位
ALTER TABLE checkin_activity 
ADD COLUMN start_datetime timestamp;

ALTER TABLE checkin_activity 
ADD COLUMN end_datetime timestamp;

-- 4. 將現有 date 資料轉換到新的 timestamp 欄位
UPDATE checkin_activity 
SET start_datetime = start_date::timestamp;

UPDATE checkin_activity 
SET end_datetime = (end_date::timestamp + interval '23 hours 59 minutes 59 seconds');

-- 5. 刪除舊的 date 欄位
ALTER TABLE checkin_activity DROP COLUMN start_date;
ALTER TABLE checkin_activity DROP COLUMN end_date;

-- 6. 重新命名新欄位
ALTER TABLE checkin_activity 
RENAME COLUMN start_datetime TO start_date;

ALTER TABLE checkin_activity 
RENAME COLUMN end_datetime TO end_date;

-- 7. 確認更新完成
SELECT 
  id,
  title,
  activity_type,
  start_date,
  end_date,
  publish_at
FROM checkin_activity 
ORDER BY id;

-- 8. 如果一切正常，可以刪除備份表（可選）
-- DROP TABLE checkin_activity_backup;