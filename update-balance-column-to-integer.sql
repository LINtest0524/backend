-- 將 balance 欄位從 decimal 改為 integer
ALTER TABLE "user" 
ALTER COLUMN balance TYPE INTEGER USING ROUND(balance);