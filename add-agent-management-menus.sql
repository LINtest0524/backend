-- 為所有公司新增代理管理選單
-- 此選單將插入在會員中心之後，每日簽到之前

-- 為公司 A (company_id = 1) 新增代理管理選單
-- 先調整現有選單的排序，為代理管理騰出位置 (sort_order = 7)
UPDATE menus SET sort_order = sort_order + 1 
WHERE company_id = 1 AND sort_order >= 7;

-- 插入代理管理主選單
INSERT INTO menus (company_id, title, url, sort_order, device_type, status, target_blank) VALUES
(1, '代理管理', '/a/agent', 7, 'both', 'active', false);

-- 插入代理管理子選單
INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
SELECT 1, m.id, '代理商', '/a/agent/dashboard', 1, 'both', 'active', false
FROM menus m WHERE m.company_id = 1 AND m.title = '代理管理' AND m.parent_id IS NULL;

-- 為公司 B (company_id = 2) 新增代理管理選單 (如果存在)
-- 先檢查公司 B 是否有選單資料
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM menus WHERE company_id = 2) THEN
        -- 調整現有選單的排序
        UPDATE menus SET sort_order = sort_order + 1 
        WHERE company_id = 2 AND sort_order >= 7;
        
        -- 插入代理管理主選單
        INSERT INTO menus (company_id, title, url, sort_order, device_type, status, target_blank) VALUES
        (2, '代理管理', '/b/agent', 7, 'both', 'active', false);
        
        -- 插入代理管理子選單
        INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
        SELECT 2, m.id, '代理商', '/b/agent/dashboard', 1, 'both', 'active', false
        FROM menus m WHERE m.company_id = 2 AND m.title = '代理管理' AND m.parent_id IS NULL;
        
        RAISE NOTICE '已為公司 B 新增代理管理選單';
    ELSE
        RAISE NOTICE '公司 B 沒有選單資料，跳過';
    END IF;
END
$$;

-- 為公司 3 (company_id = 3) 新增代理管理選單 (如果存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM menus WHERE company_id = 3) THEN
        -- 調整現有選單的排序
        UPDATE menus SET sort_order = sort_order + 1 
        WHERE company_id = 3 AND sort_order >= 7;
        
        -- 插入代理管理主選單
        INSERT INTO menus (company_id, title, url, sort_order, device_type, status, target_blank) VALUES
        (3, '代理管理', '/company3/agent', 7, 'both', 'active', false);
        
        -- 插入代理管理子選單
        INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
        SELECT 3, m.id, '代理商', '/company3/agent/dashboard', 1, 'both', 'active', false
        FROM menus m WHERE m.company_id = 3 AND m.title = '代理管理' AND m.parent_id IS NULL;
        
        RAISE NOTICE '已為公司 3 新增代理管理選單';
    ELSE
        RAISE NOTICE '公司 3 沒有選單資料，跳過';
    END IF;
END
$$;

-- 動態為所有其他公司新增代理管理選單
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
        AND EXISTS (SELECT 1 FROM menus WHERE company_id = c.id)
    LOOP
        company_code_value := company_record.code;
        
        -- 調整現有選單的排序
        UPDATE menus SET sort_order = sort_order + 1 
        WHERE company_id = company_record.id AND sort_order >= 7;
        
        -- 插入代理管理主選單
        INSERT INTO menus (company_id, title, url, sort_order, device_type, status, target_blank) VALUES
        (company_record.id, '代理管理', '/' || company_code_value || '/agent', 7, 'both', 'active', false);
        
        -- 插入代理管理子選單
        INSERT INTO menus (company_id, parent_id, title, url, sort_order, device_type, status, target_blank)
        SELECT company_record.id, m.id, '代理商', '/' || company_code_value || '/agent/dashboard', 1, 'both', 'active', false
        FROM menus m 
        WHERE m.company_id = company_record.id 
        AND m.title = '代理管理' 
        AND m.parent_id IS NULL;
        
        RAISE NOTICE '已為公司 % (ID: %) 新增代理管理選單', company_code_value, company_record.id;
    END LOOP;
END
$$;

-- 查看所有公司的選單結構（包含新增的代理管理）
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
ORDER BY c.id, m1.parent_id NULLS FIRST, m1.sort_order;

-- 驗證代理管理選單是否正確新增
SELECT 
    c.code as company_code,
    COUNT(*) as menu_count,
    COUNT(CASE WHEN m.title = '代理管理' THEN 1 END) as agent_menu_count
FROM companies c
LEFT JOIN menus m ON m.company_id = c.id
GROUP BY c.id, c.code
ORDER BY c.id;