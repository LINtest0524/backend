-- 建立占成條件相關資料表
-- 執行前請確保已有 company 和 user 表

-- 1. 建立占成條件主表
CREATE TABLE IF NOT EXISTS commission_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('SETTLEMENT_ACTIVE_MEMBERS', 'SETTLEMENT_ECPAY_PERSON')),
    "isActive" BOOLEAN DEFAULT TRUE,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    company_id INTEGER NOT NULL,
    agent_id INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 建立條件組表
CREATE TABLE IF NOT EXISTS condition_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_condition_id UUID NOT NULL,
    "minRegistrations" INTEGER DEFAULT 0,
    "minActiveMembers" INTEGER DEFAULT 0,
    "minValidBets" INTEGER DEFAULT 0,
    "minNetRevenue" DECIMAL(12,2) DEFAULT 0.00,
    "requireNegativeProfit" BOOLEAN DEFAULT FALSE,
    "sharePercent" DECIMAL(5,2) DEFAULT 0.00,
    "agentRemitPercent" DECIMAL(5,2) DEFAULT 0.00,
    "order" INTEGER NOT NULL
);

-- 3. 建立平台退水費率表
CREATE TABLE IF NOT EXISTS platform_refund_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_group_id UUID NOT NULL,
    "platformCode" VARCHAR(50) NOT NULL,
    "refundPercent" DECIMAL(5,2) DEFAULT 0.00
);

-- 4. 建立固定費用表
CREATE TABLE IF NOT EXISTS fixed_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_group_id UUID NOT NULL UNIQUE,
    "feeDeposit" DECIMAL(12,2) DEFAULT 0.00,
    "feeWithdraw" DECIMAL(12,2) DEFAULT 0.00,
    "refundBudgetPercent" DECIMAL(5,2) DEFAULT 0.00,
    "promoBudgetPercent" DECIMAL(5,2) DEFAULT 0.00,
    "bonusBudgetPercent" DECIMAL(5,2) DEFAULT 0.00
);

-- 5. 建立外鍵約束 (兼容舊版 PostgreSQL)
DO $$
BEGIN
    -- 檢查並新增 company 外鍵
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_commission_conditions_company'
    ) THEN
        ALTER TABLE commission_conditions 
        ADD CONSTRAINT fk_commission_conditions_company 
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
    END IF;

    -- 檢查並新增 agent 外鍵
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_commission_conditions_agent'
    ) THEN
        ALTER TABLE commission_conditions 
        ADD CONSTRAINT fk_commission_conditions_agent 
        FOREIGN KEY (agent_id) REFERENCES "user"(id) ON DELETE SET NULL;
    END IF;

    -- 檢查並新增 commission_condition 外鍵
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_condition_groups_commission_condition'
    ) THEN
        ALTER TABLE condition_groups 
        ADD CONSTRAINT fk_condition_groups_commission_condition 
        FOREIGN KEY (commission_condition_id) REFERENCES commission_conditions(id) ON DELETE CASCADE;
    END IF;

    -- 檢查並新增 platform_refund_rates 外鍵
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_platform_refund_rates_condition_group'
    ) THEN
        ALTER TABLE platform_refund_rates 
        ADD CONSTRAINT fk_platform_refund_rates_condition_group 
        FOREIGN KEY (condition_group_id) REFERENCES condition_groups(id) ON DELETE CASCADE;
    END IF;

    -- 檢查並新增 fixed_costs 外鍵
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_fixed_costs_condition_group'
    ) THEN
        ALTER TABLE fixed_costs 
        ADD CONSTRAINT fk_fixed_costs_condition_group 
        FOREIGN KEY (condition_group_id) REFERENCES condition_groups(id) ON DELETE CASCADE;
    END IF;

    RAISE NOTICE '✅ 外鍵約束檢查完成';
END $$;

-- 6. 建立索引
CREATE INDEX IF NOT EXISTS idx_commission_conditions_company_id ON commission_conditions(company_id);
CREATE INDEX IF NOT EXISTS idx_commission_conditions_agent_id ON commission_conditions(agent_id);
CREATE INDEX IF NOT EXISTS idx_condition_groups_commission_condition_id ON condition_groups(commission_condition_id);
CREATE INDEX IF NOT EXISTS idx_condition_groups_order ON condition_groups("order");
CREATE INDEX IF NOT EXISTS idx_platform_refund_rates_condition_group_id ON platform_refund_rates(condition_group_id);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_condition_group_id ON fixed_costs(condition_group_id);

-- 7. 更新時間戳觸發器 (PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 檢查並建立觸發器
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_commission_conditions_updated_at'
    ) THEN
        CREATE TRIGGER update_commission_conditions_updated_at 
        BEFORE UPDATE ON commission_conditions 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE '✅ 更新時間戳觸發器已建立';
    ELSE
        RAISE NOTICE '⚠️ 觸發器已存在，跳過建立';
    END IF;
END $$;

-- 驗證表格建立
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('commission_conditions', 'condition_groups', 'platform_refund_rates', 'fixed_costs')
ORDER BY table_name, ordinal_position;

SELECT 
    'commission_conditions' as table_name,
    COUNT(*) as row_count
FROM commission_conditions
UNION ALL
SELECT 
    'condition_groups' as table_name,
    COUNT(*) as row_count
FROM condition_groups
UNION ALL
SELECT 
    'platform_refund_rates' as table_name,
    COUNT(*) as row_count
FROM platform_refund_rates
UNION ALL
SELECT 
    'fixed_costs' as table_name,
    COUNT(*) as row_count
FROM fixed_costs;

-- ✅ 占成條件資料表建立完成！
-- 💡 現在可以測試占成條件的新增功能

SELECT '✅ 占成條件資料表建立完成！' as message;