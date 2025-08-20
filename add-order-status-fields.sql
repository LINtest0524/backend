-- 添加獨立的付款狀態、出貨狀態和管理員備註欄位到訂單表

ALTER TABLE orders 
ADD COLUMN payment_status VARCHAR(50) NULL,
ADD COLUMN shipping_status VARCHAR(50) NULL,
ADD COLUMN admin_notes TEXT NULL;

-- 為現有訂單設定預設值（基於現有的 status 欄位）
UPDATE orders 
SET 
  payment_status = CASE 
    WHEN status IN ('paid', 'processing', 'shipped', 'delivered') THEN 'paid'
    WHEN status = 'refunded' THEN 'refunded'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  shipping_status = CASE 
    WHEN status = 'delivered' THEN 'delivered'
    WHEN status = 'shipped' THEN 'shipped'
    WHEN status IN ('processing', 'paid') THEN 'processing'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;

-- 添加註解說明
COMMENT ON COLUMN orders.payment_status IS '付款狀態: pending(未付款), paid(已付款), refunded(退款中), cancelled(已取消)';
COMMENT ON COLUMN orders.shipping_status IS '出貨狀態: pending(未出貨), processing(準備中), shipped(已出貨), delivered(完成), cancelled(已取消)';
COMMENT ON COLUMN orders.admin_notes IS '管理員備註: 客服可編輯的內部備註';