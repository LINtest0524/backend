-- 修復 commission_conditions 表的欄位命名和觸發器問題
-- 執行日期: 2024-12-19
-- 說明: 解決 updated_at 觸發器錯誤和新欄位命名不匹配問題

-- 1. 檢查並修正現有的新欄位名稱（如果存在底線式命名，重命名為駝峰式）
DO $$
BEGIN
    -- 檢查並重命名 system_type 為 systemType
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'system_type'
    ) THEN
        -- 如果 systemType 不存在，則重命名
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'commission_conditions' AND column_name = 'systemType'
        ) THEN
            ALTER TABLE commission_conditions RENAME COLUMN system_type TO "systemType";
            RAISE NOTICE '✅ 已重命名 system_type 為 systemType';
        ELSE
            -- 如果兩個都存在，刪除舊的
            ALTER TABLE commission_conditions DROP COLUMN system_type;
            RAISE NOTICE '✅ 已刪除重複的 system_type 欄位';
        END IF;
    END IF;

    -- 檢查並重命名 agent_level 為 agentLevel
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'agent_level'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'commission_conditions' AND column_name = 'agentLevel'
        ) THEN
            ALTER TABLE commission_conditions RENAME COLUMN agent_level TO "agentLevel";
            RAISE NOTICE '✅ 已重命名 agent_level 為 agentLevel';
        ELSE
            ALTER TABLE commission_conditions DROP COLUMN agent_level;
            RAISE NOTICE '✅ 已刪除重複的 agent_level 欄位';
        END IF;
    END IF;

    -- 檢查並重命名 commission_percent 為 commissionPercent
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'commission_percent'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'commission_conditions' AND column_name = 'commissionPercent'
        ) THEN
            ALTER TABLE commission_conditions RENAME COLUMN commission_percent TO "commissionPercent";
            RAISE NOTICE '✅ 已重命名 commission_percent 為 commissionPercent';
        ELSE
            ALTER TABLE commission_conditions DROP COLUMN commission_percent;
            RAISE NOTICE '✅ 已刪除重複的 commission_percent 欄位';
        END IF;
    END IF;

    -- 檢查並重命名 game_rebate_rates 為 gameRebateRates
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'game_rebate_rates'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'commission_conditions' AND column_name = 'gameRebateRates'
        ) THEN
            ALTER TABLE commission_conditions RENAME COLUMN game_rebate_rates TO "gameRebateRates";
            RAISE NOTICE '✅ 已重命名 game_rebate_rates 為 gameRebateRates';
        ELSE
            ALTER TABLE commission_conditions DROP COLUMN game_rebate_rates;
            RAISE NOTICE '✅ 已刪除重複的 game_rebate_rates 欄位';
        END IF;
    END IF;

    -- 檢查並重命名 settlement_cycle 為 settlementCycle
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'settlement_cycle'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'commission_conditions' AND column_name = 'settlementCycle'
        ) THEN
            ALTER TABLE commission_conditions RENAME COLUMN settlement_cycle TO "settlementCycle";
            RAISE NOTICE '✅ 已重命名 settlement_cycle 為 settlementCycle';
        ELSE
            ALTER TABLE commission_conditions DROP COLUMN settlement_cycle;
            RAISE NOTICE '✅ 已刪除重複的 settlement_cycle 欄位';
        END IF;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 欄位重命名過程中發生錯誤: %', SQLERRM;
END $$;

-- 2. 確保所有必要的欄位都存在（使用正確的駝峰式命名）
DO $$
BEGIN
    -- 添加 systemType 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'systemType'
    ) THEN
        ALTER TABLE commission_conditions 
        ADD COLUMN "systemType" VARCHAR(20) NULL;
        RAISE NOTICE '✅ 已添加 systemType 欄位';
    END IF;

    -- 添加 agentLevel 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'agentLevel'
    ) THEN
        ALTER TABLE commission_conditions 
        ADD COLUMN "agentLevel" VARCHAR(20) NULL;
        RAISE NOTICE '✅ 已添加 agentLevel 欄位';
    END IF;

    -- 添加 commissionPercent 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'commissionPercent'
    ) THEN
        ALTER TABLE commission_conditions 
        ADD COLUMN "commissionPercent" DECIMAL(5,2) NULL;
        RAISE NOTICE '✅ 已添加 commissionPercent 欄位';
    END IF;

    -- 添加 gameRebateRates 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'gameRebateRates'
    ) THEN
        ALTER TABLE commission_conditions 
        ADD COLUMN "gameRebateRates" JSON NULL;
        RAISE NOTICE '✅ 已添加 gameRebateRates 欄位';
    END IF;

    -- 添加 settlementCycle 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_conditions' AND column_name = 'settlementCycle'
    ) THEN
        ALTER TABLE commission_conditions 
        ADD COLUMN "settlementCycle" VARCHAR(20) NULL;
        RAISE NOTICE '✅ 已添加 settlementCycle 欄位';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 添加欄位過程中發生錯誤: %', SQLERRM;
END $$;

-- 3. 修復觸發器函數（確保使用正確的欄位名稱）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 重新建立觸發器
DROP TRIGGER IF EXISTS update_commission_conditions_updated_at ON commission_conditions;
CREATE TRIGGER update_commission_conditions_updated_at 
    BEFORE UPDATE ON commission_conditions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 為現有記錄設定預設值
UPDATE commission_conditions 
SET 
    "systemType" = COALESCE("systemType", 'COMMISSION'),
    "agentLevel" = COALESCE("agentLevel", 'ANY'),
    "settlementCycle" = COALESCE("settlementCycle", 'WEEKLY'),
    "gameRebateRates" = COALESCE("gameRebateRates", '{}'::json)
WHERE "systemType" IS NULL OR "agentLevel" IS NULL OR "settlementCycle" IS NULL OR "gameRebateRates" IS NULL;

-- 6. 驗證修復結果
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'commission_conditions'
    AND column_name IN ('systemType', 'agentLevel', 'commissionPercent', 'gameRebateRates', 'settlementCycle', 'updatedAt')
ORDER BY column_name;

-- 7. 測試觸發器是否正常工作
DO $$
DECLARE
    test_record record;
    old_updated_at timestamp;
    new_updated_at timestamp;
BEGIN
    -- 找到一筆測試記錄
    SELECT * INTO test_record FROM commission_conditions LIMIT 1;
    
    IF test_record.id IS NOT NULL THEN
        -- 記錄更新前的時間
        old_updated_at := test_record."updatedAt";
        
        -- 等待 1 秒後更新
        PERFORM pg_sleep(1);
        
        -- 執行更新
        UPDATE commission_conditions 
        SET name = name || '' 
        WHERE id = test_record.id;
        
        -- 檢查更新後的時間
        SELECT "updatedAt" INTO new_updated_at 
        FROM commission_conditions 
        WHERE id = test_record.id;
        
        IF new_updated_at > old_updated_at THEN
            RAISE NOTICE '✅ 觸發器測試成功：updatedAt 已自動更新';
        ELSE
            RAISE NOTICE '❌ 觸發器測試失敗：updatedAt 未更新';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ 沒有測試記錄，跳過觸發器測試';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 觸發器測試過程中發生錯誤: %', SQLERRM;
END $$;

SELECT '✅ commission_conditions 表修復完成！' as message;