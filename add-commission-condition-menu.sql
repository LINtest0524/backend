-- 為所有公司的代理管理下新增「占成條件」子選單
-- 位置在「代理商」下方

-- 為公司 A (company_id = 1) 新增占成條件子選單
-- 先調整代理管理下現有子選單的排序，為占成條件騰出位置 (sort_order = 2)
UPDATE menus SET sort_order = sort_order + 1 
WHERE company_id = 1 
AND parent_id = (SELECT id FROM menus WHERE company_id = 1 AND title = '代理管理' AND parent_id IS NULL)
AND sort_order >= 2;

-- 插入占成條件子選單
INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
SELECT 1, m.id, '占成條件', '/a/agent/commission-condition', 2, 'both', 'active', false
FROM menus m WHERE m.company_id = 1 AND m.title = '代理管理' AND m.parent_id IS NULL;

-- 為公司 B (company_id = 2) 新增占成條件子選單 (如果存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM menus WHERE company_id = 2 AND title = '代理管理' AND parent_id IS NULL) THEN
        -- 調整現有子選單的排序
        UPDATE menus SET sort_order = sort_order + 1 
        WHERE company_id = 2 
        AND parent_id = (SELECT id FROM menus WHERE company_id = 2 AND title = '代理管理' AND parent_id IS NULL)
        AND sort_order >= 2;
        
        -- 插入占成條件子選單
        INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
        SELECT 2, m.id, '占成條件', '/b/agent/commission-condition', 2, 'both', 'active', false
        FROM menus m WHERE m.company_id = 2 AND m.title = '代理管理' AND m.parent_id IS NULL;
        
        RAISE NOTICE '已為公司 B 新增占成條件子選單';
    ELSE
        RAISE NOTICE '公司 B 沒有代理管理選單，跳過';
    END IF;
END
$$;

-- 為公司 3 (company_id = 3) 新增占成條件子選單 (如果存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM menus WHERE company_id = 3 AND title = '代理管理' AND parent_id IS NULL) THEN
        -- 調整現有子選單的排序
        UPDATE menus SET sort_order = sort_order + 1 
        WHERE company_id = 3 
        AND parent_id = (SELECT id FROM menus WHERE company_id = 3 AND title = '代理管理' AND parent_id IS NULL)
        AND sort_order >= 2;
        
        -- 插入占成條件子選單
        INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
        SELECT 3, m.id, '占成條件', '/company3/agent/commission-condition', 2, 'both', 'active', false
        FROM menus m WHERE m.company_id = 3 AND m.title = '代理管理' AND m.parent_id IS NULL;
        
        RAISE NOTICE '已為公司 3 新增占成條件子選單';
    ELSE
        RAISE NOTICE '公司 3 沒有代理管理選單，跳過';
    END IF;
END
$$;

-- 動態為所有其他公司新增占成條件子選單
DO $$
DECLARE
    company_record RECORD;
    company_code_value TEXT;
BEGIN
    -- 遍歷所有公司 (除了已處理的 1, 2, 3)
    FOR company_record IN 
        SELECT DISTINCT c.id, c.code 
        FROM companies c 
        WHERE c.id NOT IN (1, 2, 3) 
        AND EXISTS (SELECT 1 FROM menus WHERE company_id = c.id AND title = '代理管理' AND parent_id IS NULL)
    LOOP
        company_code_value := company_record.code;
        
        -- 調整現有子選單的排序
        UPDATE menus SET sort_order = sort_order + 1 
        WHERE company_id = company_record.id 
        AND parent_id = (SELECT id FROM menus WHERE company_id = company_record.id AND title = '代理管理' AND parent_id IS NULL)
        AND sort_order >= 2;
        
        -- 插入占成條件子選單
        INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
        SELECT company_record.id, m.id, '占成條件', '/' || company_code_value || '/agent/commission-condition', 2, 'both', 'active', false
        FROM menus m 
        WHERE m.company_id = company_record.id 
        AND m.title = '代理管理' 
        AND m.parent_id IS NULL;
        
        RAISE NOTICE '已為公司 % (ID: %) 新增占成條件子選單', company_code_value, company_record.id;
    END LOOP;
END
$$;

-- 查看所有公司的代理管理選單結構（包含新增的占成條件）
SELECT 
    c.code as company_code,
    c.id as company_id,
    m1.id as menu_id,
    CASE 
        WHEN m1.parent_id IS NULL THEN m1.title 
        ELSE CONCAT('└─ ', m1.title) 
    END as menu_title,
    m1.url,
    m1.sort_order,
    m1.status
FROM companies c
JOIN menus m1 ON m1.company_id = c.id
WHERE m1.title = '代理管理' 
   OR m1.parent_id IN (SELECT id FROM menus WHERE title = '代理管理' AND parent_id IS NULL)
ORDER BY c.id, m1.parent_id NULLS FIRST, m1.sort_order;

-- 驗證占成條件選單是否正確新增
SELECT 
    c.code as company_code,
    COUNT(CASE WHEN m.title = '占成條件' THEN 1 END) as commission_condition_menu_count
FROM companies c
LEFT JOIN menus m ON m.company_id = c.id
GROUP BY c.id, c.code
ORDER BY c.id;