-- 新增代理商擴展欄位
-- 執行前請先備份資料庫！
-- 注意：代理商資料儲存在 user 表中，不是 agents 表

-- 1. 在 user 表新增代理資料欄位
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "agent_name" varchar(100) NULL,
ADD COLUMN IF NOT EXISTS "gender" varchar(10) NULL,
ADD COLUMN IF NOT EXISTS "id_number" varchar(20) NULL;

-- 2. 在 user 表新增預設設定欄位
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "default_vip_level" varchar(20) NULL DEFAULT 'VIP0',
ADD COLUMN IF NOT EXISTS "default_rebate_settlement" varchar(20) NULL DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS "default_payment_group" varchar(50) NULL DEFAULT 'regular';

-- 3. 在 user 表新增帳號狀態欄位（使用 JSON 陣列）
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "account_status" jsonb NULL DEFAULT '["normal"]'::jsonb;

-- 4. 在 user 表新增銀行卡資料欄位（使用 JSON）
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "bank_cards" jsonb NULL DEFAULT '[]'::jsonb;

-- 5. 在 user 表新增禁止遊戲廠商欄位（使用 JSON）
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS "banned_game_providers" jsonb NULL DEFAULT '{
  "live": {"enabled": false, "providers": []},
  "slot": {"enabled": false, "providers": []},
  "sports": {"enabled": false, "providers": []},
  "lottery": {"enabled": false, "providers": []},
  "card": {"enabled": false, "providers": []},
  "fishing": {"enabled": false, "providers": []}
}'::jsonb;

-- 6. 為 id_number 新增索引（可選，提高查詢效率）
CREATE INDEX IF NOT EXISTS "IDX_user_id_number" ON "user"("id_number") WHERE "id_number" IS NOT NULL;

-- 7. 為 gender 新增檢查約束（可選，確保資料正確性）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'CHK_user_gender'
    ) THEN
        ALTER TABLE "user" 
        ADD CONSTRAINT "CHK_user_gender" 
        CHECK ("gender" IN ('MALE', 'FEMALE', NULL));
    END IF;
END $$;

-- 檢查新增的欄位
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user'
  AND column_name IN (
    'agent_name', 
    'gender', 
    'id_number', 
    'default_vip_level', 
    'default_rebate_settlement', 
    'default_payment_group', 
    'account_status', 
    'bank_cards', 
    'banned_game_providers'
  )
ORDER BY column_name;

-- 顯示成功訊息
SELECT '✅ 代理商擴展欄位新增完成！' as message;
