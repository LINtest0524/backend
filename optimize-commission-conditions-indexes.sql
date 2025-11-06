-- 佣金條件系統效能優化索引
-- 建議立即執行以提升查詢效能
-- 注意：每個索引需要單獨執行，不能在事務中執行

-- 1. 複合索引用於常見查詢組合
CREATE INDEX IF NOT EXISTS idx_commission_conditions_company_active 
ON commission_conditions(company_id, "isActive");

-- 2. 複合索引用於代理商和狀態查詢
CREATE INDEX IF NOT EXISTS idx_commission_conditions_agent_active 
ON commission_conditions(agent_id, "isActive");

-- 3. 時間範圍查詢索引
CREATE INDEX IF NOT EXISTS idx_commission_conditions_effective_dates 
ON commission_conditions("effectiveFrom", "effectiveTo");

-- 4. 更新時間排序索引 (降序，匹配查詢)
CREATE INDEX IF NOT EXISTS idx_commission_conditions_updated_at_desc 
ON commission_conditions("updatedAt" DESC);

-- 5. 條件組的複合索引
CREATE INDEX IF NOT EXISTS idx_condition_groups_condition_order 
ON condition_groups(commission_condition_id, "order");

-- 6. 平台代碼查詢索引
CREATE INDEX IF NOT EXISTS idx_platform_refund_rates_platform_code 
ON platform_refund_rates("platformCode");

-- 分析表格統計資訊 (更新統計數據)
ANALYZE commission_conditions;
ANALYZE condition_groups;
ANALYZE platform_refund_rates;
ANALYZE fixed_costs;

-- 查看索引建立狀態
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename LIKE '%commission%' OR tablename LIKE '%condition%'
ORDER BY tablename, indexname;

SELECT '✅ 佣金條件索引優化完成！' as message;