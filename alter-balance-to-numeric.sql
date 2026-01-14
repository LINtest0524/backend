-- 將 balance 欄位從 integer 改為 numeric(12, 2)
-- 這樣可以支援小數點後兩位

-- 1. 檢查當前的 balance 欄位類型
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'balance';

-- 2. 修改 balance 欄位為 numeric 類型
ALTER TABLE "user" 
ALTER COLUMN balance TYPE NUMERIC(12, 2);

-- 3. 驗證修改結果
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'balance';

-- 4. 測試查詢（確認資料沒有遺失）
SELECT id, username, balance 
FROM "user" 
WHERE username = 'eeeaaa';
