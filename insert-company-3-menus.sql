-- 為公司 ID = 3 建立娛樂城選單
-- 先清除現有的公司 3 選單資料
DELETE FROM menus WHERE company_id = 3;

-- 插入主選單項目
INSERT INTO menus (company_id, title, url, sort_order, device_type, status, target_blank) VALUES
-- 一級主選單
(3, '首頁', '/a', 1, 'both', 'active', false),
(3, '遊戲大廳', '/a/games', 2, 'both', 'active', false),
(3, '產品商城', '/a/products', 3, 'both', 'active', false),
(3, '優惠活動', '/a/promotions', 4, 'both', 'active', false),
(3, '最新消息', '/a/news', 5, 'both', 'active', false),
(3, '文章專區', '/a/articles', 6, 'both', 'active', false),
(3, '會員中心', '/a/member', 7, 'both', 'active', false),
(3, '每日簽到', '/a/daily-checkin', 8, 'both', 'active', false),
(3, '幸運轉盤', '/a/lucky-draw', 9, 'both', 'active', false),
(3, '購物車', '/a/cart', 10, 'both', 'active', false);

-- 取得剛插入的選單 ID (從資料庫查詢)
-- 遊戲大廳子選單
INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank) 
SELECT 3, m.id, '骰子遊戲', '/a/games/dice', 1, 'both', 'active', false
FROM menus m WHERE m.company_id = 3 AND m.title = '遊戲大廳' AND m.parent_id IS NULL;

INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank) 
SELECT 3, m.id, '高低遊戲', '/a/games/hi-lo', 2, 'both', 'active', false
FROM menus m WHERE m.company_id = 3 AND m.title = '遊戲大廳' AND m.parent_id IS NULL;

-- 會員中心子選單
INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank) 
SELECT 3, m.id, '個人資料', '/a/member', 1, 'both', 'active', false
FROM menus m WHERE m.company_id = 3 AND m.title = '會員中心' AND m.parent_id IS NULL;

INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank) 
SELECT 3, m.id, '優惠券管理', '/a/member/coupons', 2, 'both', 'active', false
FROM menus m WHERE m.company_id = 3 AND m.title = '會員中心' AND m.parent_id IS NULL;

INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank) 
SELECT 3, m.id, '訂單查詢', '/a/orders', 3, 'both', 'active', false
FROM menus m WHERE m.company_id = 3 AND m.title = '會員中心' AND m.parent_id IS NULL;

INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank) 
SELECT 3, m.id, '身份驗證', '/a/member/id-verification', 4, 'both', 'active', false
FROM menus m WHERE m.company_id = 3 AND m.title = '會員中心' AND m.parent_id IS NULL;

INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank) 
SELECT 3, m.id, '銀行驗證', '/a/member/bank-verification', 5, 'both', 'active', false
FROM menus m WHERE m.company_id = 3 AND m.title = '會員中心' AND m.parent_id IS NULL;

-- 新增一些特殊選單項目
INSERT INTO menus (company_id, title, url, sort_order, device_type, status, target_blank) VALUES
(3, '訊息中心', '/a/messages', 11, 'both', 'active', false),
(3, '綠界付款', '/a/ecpay-payment', 12, 'both', 'active', false);

-- 查看插入結果
SELECT 
    m1.id,
    m1.title as main_menu,
    m2.title as sub_menu,
    m1.url,
    m1.sort_order,
    m1.device_type,
    m1.status
FROM menus m1 
LEFT JOIN menus m2 ON m2.parent_id = m1.id 
WHERE m1.company_id = 3 
ORDER BY m1.sort_order, m2.sort_order;