-- 為 system_broadcast 表添加標籤群組支援欄位
-- 這個 SQL 檔案用於更新現有的 system_broadcast 表結構

-- 1. 更新 broadcast_type 欄位以支援 TAG_GROUP
ALTER TABLE system_broadcast 
ALTER COLUMN broadcast_type TYPE varchar(50);

-- 2. 更新 target_audience 欄位以支援 TAG_USERS
ALTER TABLE system_broadcast 
ALTER COLUMN target_audience TYPE varchar(50);

-- 3. 新增目標標籤ID欄位
ALTER TABLE system_broadcast 
ADD COLUMN IF NOT EXISTS target_tag_ids TEXT;

-- 4. 新增目標標籤名稱欄位
ALTER TABLE system_broadcast 
ADD COLUMN IF NOT EXISTS target_tag_names TEXT;

-- 驗證欄位是否成功添加
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'system_broadcast' 
  AND column_name IN ('target_tag_ids', 'target_tag_names');