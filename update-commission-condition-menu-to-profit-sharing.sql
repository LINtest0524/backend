-- 將所有公司的「占成條件」選單更名為「分潤管理」
-- 這個腳本會更新數據庫中的選單標題

-- 更新所有公司的占成條件選單標題
UPDATE menus 
SET title = '分潤管理'
WHERE title = '占成條件';

-- 查看更新結果
SELECT 
    c.code as company_code,
    c.id as company_id,
    m.id as menu_id,
    m.title,
    m.url,
    m.sort_order,
    m.status
FROM companies c
JOIN menus m ON m.company_id = c.id
WHERE m.title = '分潤管理'
ORDER BY c.id, m.sort_order;

-- 驗證更新完成
SELECT 
    COUNT(*) as total_updated_menus,
    COUNT(DISTINCT company_id) as companies_affected
FROM menus 
WHERE title = '分潤管理';

-- 確認沒有遺留的「占成條件」選單
SELECT 
    COUNT(*) as remaining_old_menus
FROM menus 
WHERE title = '占成條件';