-- 更新系統廣播類型，支援優惠券通知
-- 解決公共優惠碼通知無法插入的問題

-- 1. 移除現有的檢查約束
ALTER TABLE system_broadcast DROP CONSTRAINT IF EXISTS system_broadcast_broadcast_type_check;

-- 2. 重新建立包含優惠券類型的檢查約束
ALTER TABLE system_broadcast 
ADD CONSTRAINT system_broadcast_broadcast_type_check 
CHECK (broadcast_type IN (
    'GENERAL', 
    'URGENT', 
    'MAINTENANCE', 
    'PROMOTION',
    'IMPORTANT',
    'NEW_MEMBER',
    'TAG_GROUP',
    'COUPON_DISTRIBUTION',
    'PUBLIC_COUPON_RELEASE'
));

-- 3. 檢查結果
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'system_broadcast'::regclass 
AND conname LIKE '%broadcast_type%';