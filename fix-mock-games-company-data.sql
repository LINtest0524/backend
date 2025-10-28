-- 修復 mock-games 表的公司資料隔離
-- company_id 欄位已存在，只需要修復資料和約束

-- 檢查當前的 mock-games 記錄
SELECT 'bet_txn' as table_name, COUNT(*) as total, company_id 
FROM mock_games_bet_txn 
GROUP BY company_id
UNION ALL
SELECT 'round_result' as table_name, COUNT(*) as total, company_id 
FROM mock_games_round_result 
GROUP BY company_id
ORDER BY table_name, company_id;

-- 為沒有 company_id 的記錄設定預設值（假設是公司 1）
UPDATE mock_games_bet_txn 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE mock_games_round_result 
SET company_id = 1 
WHERE company_id IS NULL;

-- 檢查是否已有外鍵約束和索引（如果報錯表示已存在，可以忽略）
DO $$
BEGIN
    -- 添加索引以提升查詢效能
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_bet_txn_company_player'
    ) THEN
        CREATE INDEX idx_bet_txn_company_player ON mock_games_bet_txn(company_id, playerId);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_round_result_company_player'
    ) THEN
        CREATE INDEX idx_round_result_company_player ON mock_games_round_result(company_id, playerId);
    END IF;
END $$;

-- 確認修復結果
SELECT 'bet_txn' as table_name, COUNT(*) as total, company_id 
FROM mock_games_bet_txn 
GROUP BY company_id
UNION ALL
SELECT 'round_result' as table_name, COUNT(*) as total, company_id 
FROM mock_games_round_result 
GROUP BY company_id
ORDER BY table_name, company_id;