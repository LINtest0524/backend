-- 添加公司運送規則欄位
-- 執行日期: 2024年

ALTER TABLE company 
ADD COLUMN shipping_rules JSON NULL 
COMMENT '公司運送規則設定，包含配送方式、基本運費和免運門檻';

-- 設定預設運送規則（可選）
UPDATE company SET shipping_rules = '[
  {
    "id": "store_pickup",
    "name": "7-11超商取貨",
    "fee": 60,
    "freeThreshold": 399,
    "description": "3-5個工作天到店",
    "enabled": true
  },
  {
    "id": "home_delivery", 
    "name": "宅配",
    "fee": 210,
    "freeThreshold": 999,
    "description": "1-3個工作天送達",
    "enabled": true
  },
  {
    "id": "post_office",
    "name": "郵局寄送", 
    "fee": 80,
    "freeThreshold": 500,
    "description": "5-7個工作天送達",
    "enabled": true
  }
]' WHERE shipping_rules IS NULL;

COMMENT ON COLUMN company.shipping_rules IS '運送規則設定 JSON 格式';