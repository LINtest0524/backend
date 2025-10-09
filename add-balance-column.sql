-- 為 user 資料表新增餘額欄位
ALTER TABLE "user" 
ADD COLUMN balance DECIMAL(10,2) DEFAULT 0;

-- 為現有使用者設定預設餘額為 0
UPDATE "user" SET balance = 0 WHERE balance IS NULL;

-- 新增註解說明欄位用途
COMMENT ON COLUMN "user".balance IS '使用者帳戶餘額，用於各種功能的金額計算';