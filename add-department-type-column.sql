-- 為用戶表添加部門類型欄位
-- 用於標記管理員所屬的單位/部門

ALTER TABLE "user" ADD COLUMN "department_type" varchar(255) NULL;

-- 添加註解說明
COMMENT ON COLUMN "user"."department_type" IS '部門類型，例如：行銷、後台、客服、財務等';