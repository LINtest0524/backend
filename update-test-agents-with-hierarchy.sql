-- 更新測試代理商的父子關係
-- 設定火影(Level 2)的父級為測試代理商A-1(Level 1)

-- 首先查看現有的代理商
SELECT id, display_name, agent_level, parent_agent_id, company_id FROM agents ORDER BY id;

-- 更新火影的父級代理商
UPDATE agents 
SET parent_agent_id = (
    SELECT id FROM agents 
    WHERE display_name = '測試代理商A-1' 
    AND agent_level = 1 
    LIMIT 1
)
WHERE display_name = '火影' 
AND agent_level = 2;

-- 驗證更新結果
SELECT 
    a.id,
    a.display_name,
    a.agent_level,
    a.parent_agent_id,
    p.display_name as parent_name
FROM agents a
LEFT JOIN agents p ON a.parent_agent_id = p.id
ORDER BY a.agent_level, a.id;