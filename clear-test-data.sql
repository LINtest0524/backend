-- 清除測試帳號 testPlayer123 的所有遊戲記錄
-- 這個腳本會移除所有測試用的虛擬資料

-- 刪除測試玩家的下注記錄
DELETE FROM mock_games_bet_txn WHERE "playerId" = 'testPlayer123';

-- 刪除測試玩家的遊戲結果記錄  
DELETE FROM mock_games_round_result WHERE "playerId" = 'testPlayer123';

-- 檢查是否還有其他測試帳號（以 test 開頭的）
SELECT DISTINCT "playerId" FROM mock_games_bet_txn WHERE "playerId" LIKE 'test%';
SELECT DISTINCT "playerId" FROM mock_games_round_result WHERE "playerId" LIKE 'test%';

-- 如果發現其他測試帳號，也一併清除
DELETE FROM mock_games_bet_txn WHERE "playerId" LIKE 'test%';
DELETE FROM mock_games_round_result WHERE "playerId" LIKE 'test%';

-- 驗證清除結果
SELECT COUNT(*) as bet_count FROM mock_games_bet_txn WHERE "playerId" LIKE 'test%';
SELECT COUNT(*) as result_count FROM mock_games_round_result WHERE "playerId" LIKE 'test%';