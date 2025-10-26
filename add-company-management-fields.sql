-- 公司管理系統：新增欄位
-- 執行前請先備份資料庫
-- 注意：使用現有的 company 表（單數）

-- 1. 新增欄位（安全方式）
DO $$
BEGIN
  -- 新增 description 欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company' AND column_name = 'description') THEN
    ALTER TABLE company ADD COLUMN description TEXT;
  END IF;

  -- 新增 status 欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company' AND column_name = 'status') THEN
    ALTER TABLE company ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;

  -- 新增 domain 欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company' AND column_name = 'domain') THEN
    ALTER TABLE company ADD COLUMN domain VARCHAR(255);
  END IF;

  -- 新增 settings 欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company' AND column_name = 'settings') THEN
    ALTER TABLE company ADD COLUMN settings JSON;
  END IF;

  -- 新增 created_at 欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company' AND column_name = 'created_at') THEN
    ALTER TABLE company ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- 新增 updated_at 欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company' AND column_name = 'updated_at') THEN
    ALTER TABLE company ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- 2. 新增唯一約束（安全方式）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'company_code_unique') THEN
    ALTER TABLE company ADD CONSTRAINT company_code_unique UNIQUE (code);
  END IF;
END $$;

-- 3. 更新現有資料的狀態
UPDATE company SET status = 'active' WHERE status IS NULL;

-- 4. 建立索引（安全方式）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_company_status') THEN
    CREATE INDEX idx_company_status ON company (status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_company_code') THEN
    CREATE INDEX idx_company_code ON company (code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_company_created_at') THEN
    CREATE INDEX idx_company_created_at ON company (created_at);
  END IF;
END $$;

-- 5. 更新現有資料的時間戳記（如果為空）
UPDATE company 
SET 
  created_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL OR updated_at IS NULL;

-- 6. 建立觸發器來自動更新 updated_at
CREATE OR REPLACE FUNCTION update_company_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_updated_at_trigger ON company;
CREATE TRIGGER company_updated_at_trigger
  BEFORE UPDATE ON company
  FOR EACH ROW
  EXECUTE FUNCTION update_company_updated_at();

-- 7. 驗證資料
SELECT 
  id,
  name,
  code,
  status,
  created_at,
  updated_at
FROM company
ORDER BY id;