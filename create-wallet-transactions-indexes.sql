-- 為 wallet_transactions 表創建索引

-- 檢查索引是否已存在，不存在則創建
DO $$
BEGIN
    -- 用戶和公司組合索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallet_transactions_user_company') THEN
        CREATE INDEX idx_wallet_transactions_user_company ON wallet_transactions (user_id, company_id);
    END IF;
    
    -- 創建時間索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallet_transactions_created_at') THEN
        CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions (created_at);
    END IF;
    
    -- 交易類型索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallet_transactions_type') THEN
        CREATE INDEX idx_wallet_transactions_type ON wallet_transactions (transaction_type);
    END IF;
    
    -- 關聯類型和ID索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallet_transactions_reference') THEN
        CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions (reference_type, reference_id);
    END IF;
END
$$;