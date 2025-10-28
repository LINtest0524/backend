-- 為 mock-games 表添加 company_id 欄位以實現公司隔離

-- 1. 為 mock_games_bet_txn 表添加 company_id
ALTER TABLE mock_games_bet_txn ADD COLUMN company_id INTEGER;

-- 2. 為 mock_games_round_result 表添加 company_id  
ALTER TABLE mock_games_round_result ADD COLUMN company_id INTEGER;

-- 3. 添加外鍵約束（如果 companies 表存在）
-- ALTER TABLE mock_games_bet_txn ADD CONSTRAINT fk_bet_txn_company 
--     FOREIGN KEY (company_id) REFERENCES companies(id);

-- ALTER TABLE mock_games_round_result ADD CONSTRAINT fk_round_result_company 
--     FOREIGN KEY (company_id) REFERENCES companies(id);

-- 4. 為現有記錄設定預設公司 ID（假設是公司 1）
UPDATE mock_games_bet_txn SET company_id = 1 WHERE company_id IS NULL;
UPDATE mock_games_round_result SET company_id = 1 WHERE company_id IS NULL;

-- 5. 添加索引以提升查詢效能
CREATE INDEX idx_bet_txn_company_player ON mock_games_bet_txn(company_id, playerId);
CREATE INDEX idx_round_result_company_player ON mock_games_round_result(company_id, playerId);

-- 6. 檢查結果
SELECT COUNT(*) as bet_txn_total, company_id FROM mock_games_bet_txn GROUP BY company_id;
SELECT COUNT(*) as round_result_total, company_id FROM mock_games_round_result GROUP BY company_id;