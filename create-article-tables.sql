-- 建立文章分類表
CREATE TABLE article_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    sort INTEGER DEFAULT 0,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slug, "companyId")
);

-- 建立文章表
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    publish_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    sort INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    "companyId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("categoryId") REFERENCES article_categories(id) ON DELETE CASCADE
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_article_categories_company ON article_categories("companyId");
CREATE INDEX idx_article_categories_status ON article_categories(status);
CREATE INDEX idx_article_categories_sort ON article_categories(sort);

CREATE INDEX idx_articles_company ON articles("companyId");
CREATE INDEX idx_articles_category ON articles("categoryId");
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_publish_date ON articles(publish_date);
CREATE INDEX idx_articles_featured ON articles(is_featured);

-- 建立上傳目錄（需要手動建立）
-- mkdir -p ./public/uploads/articles

-- 插入範例分類資料
INSERT INTO article_categories (name, slug, description, "companyId", sort) VALUES
('技術文章', 'tech', '技術相關文章', 1, 1),
('產品介紹', 'products', '產品介紹文章', 1, 2),
('公司動態', 'company-news', '公司最新動態', 1, 3),
('技術分享', 'tech-share', '技術分享文章', 2, 1),
('市場分析', 'market-analysis', '市場分析報告', 2, 2);

-- 插入範例文章資料
INSERT INTO articles (title, summary, content, status, "companyId", "categoryId", is_featured) VALUES
('如何使用我們的新產品', '詳細介紹新產品的使用方法', '這裡是完整的產品使用教學內容...', 'ACTIVE', 1, 2, true),
('2024年技術趨勢分析', '分析今年的技術發展趨勢', '今年的技術發展呈現以下幾個特點...', 'ACTIVE', 1, 1, false),
('公司獲得重要認證', '我們獲得了業界重要認證', '經過長期努力，公司終於獲得...', 'ACTIVE', 1, 3, false),
('前端開發最佳實踐', '分享前端開發的最佳實踐', '在前端開發過程中，我們總結了...', 'ACTIVE', 2, 1, true),
('市場競爭力分析報告', '深度分析當前市場競爭狀況', '根據最新的市場調研數據...', 'ACTIVE', 2, 2, false);