-- 為 commission_conditions 表添加新欄位
-- 執行日期: 2024-12-19
-- 說明: 添加新的分潤系統欄位以支援新的表單結構

-- 添加代理制度類型欄位
ALTER TABLE commission_conditions 
ADD COLUMN system_type VARCHAR(20) NULL COMMENT '代理制度類型: COMMISSION=占成制, REBATE=返水制';

-- 添加代理級別欄位
ALTER TABLE commission_conditions 
ADD COLUMN agent_level VARCHAR(20) NULL COMMENT '代理級別: ANY=任一層級, LEVEL_1~LEVEL_12=1-12級代理';

-- 添加代理占成比例欄位
ALTER TABLE commission_conditions 
ADD COLUMN commission_percent DECIMAL(5,2) NULL COMMENT '代理占成比例(%)';

-- 添加遊戲返水比例欄位 (JSON格式)
ALTER TABLE commission_conditions 
ADD COLUMN game_rebate_rates JSON NULL COMMENT '遊戲返水比例: {"live":1.5,"slot":2.0,"sport":1.0,"lottery":0.5,"card":1.8,"fishing":2.2}';

-- 添加結算週期欄位
ALTER TABLE commission_conditions 
ADD COLUMN settlement_cycle VARCHAR(20) NULL COMMENT '結算週期: WEEKLY=週結, MONTHLY=月結';

-- 可選：為現有資料設定預設值
UPDATE commission_conditions 
SET 
  system_type = 'COMMISSION',
  agent_level = 'ANY',
  settlement_cycle = 'WEEKLY'
WHERE system_type IS NULL;

-- 顯示新增欄位的確認
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'commission_conditions'
  AND COLUMN_NAME IN ('system_type', 'agent_level', 'commission_percent', 'game_rebate_rates', 'settlement_cycle')
ORDER BY ORDINAL_POSITION;