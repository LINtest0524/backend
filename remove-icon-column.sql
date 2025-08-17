-- 移除產品分類表的圖示欄位
-- 執行前請先備份資料庫

ALTER TABLE product_category DROP COLUMN IF EXISTS icon;