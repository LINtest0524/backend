-- 在 user 表中創建 id=0 的特殊記錄代表「任意代理商」
-- 這樣可以滿足外鍵約束，同時保持邏輯清晰

-- 1. 檢查是否已存在 id=0 的記錄
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = 0) THEN
        -- 2. 插入特殊的「任意代理商」記錄
        INSERT INTO "user" (
            id,
            username,
            agent_name,
            role,
            company_id,
            agent_level,
            status,
            password,
            created_at,
            updated_at
        ) VALUES (
            0,                              -- id = 0 (特殊標識)
            'any_agent',                    -- 系統用戶名
            '任意代理商',                     -- 顯示名稱
            'SUPER_ADMIN',                  -- 使用有效的角色
            1,                              -- 預設公司 (可以調整)
            0,                              -- 特殊層級
            'active',                       -- 啟用狀態
            'N/A',                          -- 不需要密碼
            CURRENT_TIMESTAMP,              -- 建立時間
            CURRENT_TIMESTAMP               -- 更新時間
        );
        
        RAISE NOTICE '✅ 已創建「任意代理商」特殊記錄 (id=0)';
    ELSE
        RAISE NOTICE '⚠️ id=0 的記錄已存在，跳過創建';
    END IF;
END $$;

-- 3. 驗證記錄是否正確創建
SELECT 
    id,
    username,
    agent_name,
    role,
    agent_level,
    status
FROM "user" 
WHERE id = 0;

-- 4. 測試占成條件插入
DO $$
BEGIN
    -- 嘗試插入一筆測試資料
    INSERT INTO commission_conditions (
        name, 
        method, 
        "isActive", 
        company_id, 
        agent_id
    ) VALUES (
        'TEST-任意代理商-最終測試',
        'SETTLEMENT_ACTIVE_MEMBERS',
        true,
        3,
        0
    );
    
    RAISE NOTICE '✅ 占成條件測試插入成功！';
    
    -- 立即清理測試資料
    DELETE FROM commission_conditions WHERE name = 'TEST-任意代理商-最終測試';
    RAISE NOTICE '✅ 測試資料已清理';
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ 測試插入失敗: %', SQLERRM;
END $$;

SELECT '「任意代理商」解決方案實施完成！現在可以正常使用 agent_id = 0' as message;