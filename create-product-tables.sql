-- 創建商品分類表
CREATE TABLE IF NOT EXISTS product_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image VARCHAR(255),
    icon VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    company_id INTEGER NOT NULL REFERENCES company(id),
    created_by_id INTEGER REFERENCES "user"(id),
    parent_id INTEGER REFERENCES product_category(id)
);

-- 創建商品表
CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    images JSON,
    thumbnail VARCHAR(255),
    weight DECIMAL(3,2),
    dimensions VARCHAR(100),
    specifications JSON,
    tags JSON,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK')),
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    company_id INTEGER NOT NULL REFERENCES company(id),
    category_id INTEGER REFERENCES product_category(id),
    created_by_id INTEGER REFERENCES "user"(id)
);

-- 創建分類樹狀結構的閉包表（TypeORM closure table）
CREATE TABLE IF NOT EXISTS product_category_closure (
    id_ancestor INTEGER NOT NULL REFERENCES product_category(id) ON DELETE CASCADE,
    id_descendant INTEGER NOT NULL REFERENCES product_category(id) ON DELETE CASCADE,
    PRIMARY KEY (id_ancestor, id_descendant)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_product_category_company ON product_category(company_id);
CREATE INDEX IF NOT EXISTS idx_product_category_parent ON product_category(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_category_slug ON product_category(slug);
CREATE INDEX IF NOT EXISTS idx_product_category_active ON product_category(is_active, is_visible);

CREATE INDEX IF NOT EXISTS idx_product_company ON product(company_id);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_sku ON product(sku);
CREATE INDEX IF NOT EXISTS idx_product_status ON product(status);
CREATE INDEX IF NOT EXISTS idx_product_featured ON product(is_featured);
CREATE INDEX IF NOT EXISTS idx_product_visible ON product(is_visible);
CREATE INDEX IF NOT EXISTS idx_product_price ON product(price);

-- 創建上傳目錄（需要手動創建）
-- mkdir -p public/uploads/products
-- mkdir -p public/uploads/categories