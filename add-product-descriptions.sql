-- 添加商品規格說明和配送說明欄位
ALTER TABLE product 
ADD COLUMN specifications_description TEXT NULL,
ADD COLUMN shipping_description TEXT NULL;

-- 添加註釋
COMMENT ON COLUMN product.specifications_description IS '規格說明 - 用於前台規格說明分頁顯示';
COMMENT ON COLUMN product.shipping_description IS '配送說明 - 用於前台配送說明分頁顯示';