-- 創建產品變體表
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- 變體名稱，如：紅色-大號
    sku VARCHAR(50) UNIQUE NOT NULL, -- 獨立的SKU
    price DECIMAL(10,2) NOT NULL, -- 變體價格
    original_price DECIMAL(10,2), -- 變體原價
    stock_quantity INTEGER DEFAULT 0, -- 變體庫存
    min_stock INTEGER DEFAULT 0, -- 最低庫存警告
    variant_options JSON, -- 規格選項 {"color": "紅色", "size": "大號"}
    images JSON, -- 變體專屬圖片
    is_default BOOLEAN DEFAULT FALSE, -- 是否為預設變體
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, OUT_OF_STOCK
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_status ON product_variants(status);

-- 確保每個產品至少有一個預設變體
CREATE UNIQUE INDEX idx_product_variants_default_unique 
ON product_variants(product_id) 
WHERE is_default = TRUE;

-- 更新訂單項目表，添加變體支援
ALTER TABLE order_items 
ADD COLUMN product_variant_id INTEGER REFERENCES product_variants(id),
ADD COLUMN variant_name VARCHAR(100),
ADD COLUMN variant_options JSON;

-- 為現有產品創建預設變體的函數
CREATE OR REPLACE FUNCTION create_default_variants_for_existing_products()
RETURNS void AS $$
DECLARE
    product_record RECORD;
BEGIN
    FOR product_record IN 
        SELECT id, name, sku, price, original_price, stock_quantity, min_stock, images
        FROM product 
        WHERE deleted_at IS NULL
    LOOP
        INSERT INTO product_variants (
            product_id, 
            variant_name, 
            sku, 
            price, 
            original_price, 
            stock_quantity, 
            min_stock, 
            variant_options,
            images,
            is_default,
            status
        ) VALUES (
            product_record.id,
            '預設規格',
            product_record.sku || '-DEFAULT',
            product_record.price,
            product_record.original_price,
            product_record.stock_quantity,
            product_record.min_stock,
            '{}',
            product_record.images,
            TRUE,
            'ACTIVE'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 執行函數為現有產品創建預設變體
SELECT create_default_variants_for_existing_products();

-- 清理函數
DROP FUNCTION create_default_variants_for_existing_products();