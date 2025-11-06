-- 暫時停用代理商建立功能的 API 端點
-- 因為目前建立功能還在調整中，建議先專注於列表和權限功能測試

-- 檢查現有代理商用戶
SELECT 
    id,
    username,
    agent_name,
    agent_level,
    parent_agent_id,
    role,
    company_id,
    status
FROM users 
WHERE role LIKE 'AGENT_LEVEL_%' 
ORDER BY company_id, agent_level, id;