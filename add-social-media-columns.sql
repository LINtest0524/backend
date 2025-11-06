-- 添加社交媒體聯絡方式欄位到 user 表
-- 執行日期: 2025-11-05
-- 說明: 為代理商管理系統添加 Telegram、LINE、QQ 和備註欄位

ALTER TABLE "user" 
ADD COLUMN telegram VARCHAR(255),
ADD COLUMN line VARCHAR(255),
ADD COLUMN qq VARCHAR(255),
ADD COLUMN note TEXT;

-- 為新欄位添加註解
COMMENT ON COLUMN "user".telegram IS '代理商 Telegram 帳號';
COMMENT ON COLUMN "user".line IS '代理商 LINE ID';
COMMENT ON COLUMN "user".qq IS '代理商 QQ 號碼';
COMMENT ON COLUMN "user".note IS '代理商備註資訊';

-- 檢查欄位是否添加成功
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user' 
AND column_name IN ('telegram', 'line', 'qq', 'note')
ORDER BY column_name;