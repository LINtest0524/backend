-- 新增 send_to_new_members 和 valid_days 欄位到 system_broadcast 表
ALTER TABLE system_broadcast 
ADD COLUMN send_to_new_members BOOLEAN DEFAULT FALSE;

ALTER TABLE system_broadcast 
ADD COLUMN valid_days INT NULL;

-- 更新現有資料：根據廣播類型自動設定 send_to_new_members
UPDATE system_broadcast 
SET send_to_new_members = TRUE 
WHERE broadcast_type IN ('IMPORTANT', 'MAINTENANCE', 'NEW_MEMBER');

UPDATE system_broadcast 
SET send_to_new_members = FALSE 
WHERE broadcast_type = 'GENERAL';

-- 將舊的 URGENT 和 PROMOTION 類型更新為新的分類
UPDATE system_broadcast 
SET broadcast_type = 'IMPORTANT', send_to_new_members = TRUE 
WHERE broadcast_type = 'URGENT';

UPDATE system_broadcast 
SET broadcast_type = 'GENERAL', send_to_new_members = FALSE 
WHERE broadcast_type = 'PROMOTION';