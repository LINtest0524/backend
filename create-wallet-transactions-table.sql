-- 錢包交易記錄表
-- 用於記錄所有錢包相關的交易（儲值、優惠券兌換等）

CREATE TABLE wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, 
  -- 交易類型：'coupon_redeem'（優惠券兌換）, 'manual_recharge'（手動儲值）, 'admin_adjustment'（管理員調整）
  
  amount INTEGER NOT NULL, 
  -- 金額（正數為收入，負數為支出，以分為單位，避免浮點數問題）
  
  balance_before INTEGER NOT NULL, 
  -- 交易前餘額
  
  balance_after INTEGER NOT NULL, 
  -- 交易後餘額
  
  description TEXT NOT NULL, 
  -- 描述（如：現金優惠券XXXX兌換）
  
  reference_id VARCHAR(100), 
  -- 關聯ID（優惠券ID、手動儲值記錄ID等）
  
  reference_type VARCHAR(50), 
  -- 關聯類型（'coupon'、'manual'、'admin'等）
  
  ip_address VARCHAR(45),
  -- IP地址
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- 交易時間
  
  created_by INTEGER
  -- 操作人員ID（手動操作時記錄管理員ID）
);

-- 創建索引
CREATE INDEX idx_wallet_transactions_user_company ON wallet_transactions (user_id, company_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions (created_at);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions (transaction_type);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions (reference_type, reference_id);

-- 添加註解
COMMENT ON TABLE wallet_transactions IS '錢包交易記錄表';
COMMENT ON COLUMN wallet_transactions.transaction_type IS '交易類型：coupon_redeem、manual_recharge、admin_adjustment等';
COMMENT ON COLUMN wallet_transactions.amount IS '交易金額，正數為收入，負數為支出，以分為單位';
COMMENT ON COLUMN wallet_transactions.balance_before IS '交易前餘額';
COMMENT ON COLUMN wallet_transactions.balance_after IS '交易後餘額';
COMMENT ON COLUMN wallet_transactions.reference_id IS '關聯記錄ID，如優惠券ID、儲值記錄ID等';
COMMENT ON COLUMN wallet_transactions.reference_type IS '關聯類型：coupon、manual、admin等';