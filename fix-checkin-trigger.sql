-- 修復簽到活動表的 updated_at trigger 函數
-- 問題：trigger 函數使用了錯誤的欄位名稱

-- 先刪除現有的 trigger（如果存在）
DROP TRIGGER IF EXISTS update_checkin_activity_updated_at ON checkin_activity;

-- 創建或替換 trigger 函數，使用正確的欄位名稱
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為簽到活動表創建 trigger
CREATE TRIGGER update_checkin_activity_updated_at
    BEFORE UPDATE ON checkin_activity
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 確認 trigger 已創建
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname = 'checkin_activity';