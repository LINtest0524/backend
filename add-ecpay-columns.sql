-- 新增綠界金流相關欄位到 orders 表
ALTER TABLE orders 
ADD COLUMN ecpay_merchant_trade_no VARCHAR(255),
ADD COLUMN ecpay_trade_no VARCHAR(255),
ADD COLUMN ecpay_payment_type VARCHAR(255),
ADD COLUMN ecpay_payment_date VARCHAR(255),
ADD COLUMN ecpay_return_data TEXT;

-- 新增索引以提升查詢效能
CREATE INDEX idx_orders_ecpay_merchant_trade_no ON orders(ecpay_merchant_trade_no);
CREATE INDEX idx_orders_ecpay_trade_no ON orders(ecpay_trade_no);