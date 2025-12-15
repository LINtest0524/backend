-- 建立遊戲提供商表格
CREATE TABLE IF NOT EXISTS game_providers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'live', 'slot', 'sports', 'card', 'lottery', 'fishing' 等
    is_active BOOLEAN DEFAULT true,
    logo_url VARCHAR(500),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_game_providers_category ON game_providers(category);
CREATE INDEX IF NOT EXISTS idx_game_providers_active ON game_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_game_providers_sort_order ON game_providers(sort_order);

-- 插入您的真實遊戲提供商
INSERT INTO game_providers (code, name, category, is_active, sort_order) VALUES
('WM', 'WM真人', 'live', true, 1),
('RG', 'RG電子', 'slot', true, 2),
('DG', 'DG真人', 'live', true, 3)
ON CONFLICT (code) DO NOTHING;

-- 顯示結果
SELECT * FROM game_providers ORDER BY sort_order, name;