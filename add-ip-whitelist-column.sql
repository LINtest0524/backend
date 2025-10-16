-- 為用戶表添加IP白名單欄位
-- 如果為空，代表沒有IP限制
-- 如果有值，則該用戶只能從指定IP登入

ALTER TABLE "user" ADD COLUMN "ip_whitelist" varchar(255) NULL;

-- 添加註解說明
COMMENT ON COLUMN "user"."ip_whitelist" IS 'IP白名單，如果為空則不限制IP，如果有值則只允許該IP登入';