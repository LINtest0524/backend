-- 添加運費規則欄位到商品表
-- 執行日期: 2024年

ALTER TABLE product 
ADD COLUMN shipping_rules JSON NULL 
COMMENT '運費規則設定，包含配送方式、基本運費和免運門檻';

-- 更新現有商品的運費規則為空陣列（可選）
-- UPDATE product SET shipping_rules = '[]' WHERE shipping_rules IS NULL;

-- 範例運費規則格式：
-- [
--   {
--     "method": "7-11超商取貨",
--     "base_fee": 60,
--     "free_shipping_threshold": 399
--   },
--   {
--     "method": "宅配",
--     "base_fee": 210,
--     "free_shipping_threshold": 999
--   }
-- ]