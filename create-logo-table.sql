-- 創建 logo 表
CREATE TABLE IF NOT EXISTS logo (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("companyId") REFERENCES company(id) ON DELETE CASCADE
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_logo_company_id ON logo("companyId");
CREATE INDEX IF NOT EXISTS idx_logo_is_active ON logo(is_active);

-- 創建 logo 上傳目錄（需要手動創建）
-- mkdir -p ./public/uploads/logo