-- 修改 password 欄位為可空，以支援 Facebook 登入
-- 請在您的資料庫中執行這個 SQL

-- 修改 password 欄位為可空
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

-- 檢查修改結果
\d "user";