-- 移除商品表中的重量和尺寸欄位
-- 因為改用動態規格欄位 (specifications) 來處理

ALTER TABLE product DROP COLUMN IF EXISTS weight;
ALTER TABLE product DROP COLUMN IF EXISTS dimensions;