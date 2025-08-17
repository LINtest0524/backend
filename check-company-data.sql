-- 檢查公司資料
SELECT id, name, code FROM company;

-- 如果沒有 code 為 'a' 的公司，請執行以下其中一個語句：

-- 選項1：如果已有公司資料，更新第一個公司的 code 為 'a'
-- UPDATE company SET code = 'a' WHERE id = 1;

-- 選項2：如果沒有公司資料，插入一個新的公司
-- INSERT INTO company (name, code, passwordModes, loginMethods) 
-- VALUES ('測試公司', 'a', 'OLD_PASSWORD', 'USERNAME_PASSWORD,FACEBOOK');

-- 檢查商品分類資料
SELECT id, name, company_id, is_active, is_visible FROM product_category WHERE deleted_at IS NULL;

-- 檢查商品資料
SELECT id, name, company_id, status, is_visible FROM product WHERE deleted_at IS NULL;