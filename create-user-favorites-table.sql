-- 創建用戶收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_type VARCHAR(50) NOT NULL COMMENT '項目類型：product, article, promotion',
    item_id INTEGER NOT NULL COMMENT '項目ID',
    snapshot TEXT COMMENT '收藏時的快照數據（JSON）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 唯一約束：一個用戶對同一項目只能收藏一次
    UNIQUE KEY unique_user_item (user_id, item_type, item_id),
    
    -- 索引優化
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_item_type_id (item_type, item_id),
    INDEX idx_user_type (user_id, item_type),
    
    -- 外鍵約束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 插入測試數據（可選）
-- INSERT INTO user_favorites (user_id, item_type, item_id, snapshot) VALUES
-- (1, 'product', 1, '{"id":1,"name":"測試商品","price":100}'),
-- (1, 'product', 2, '{"id":2,"name":"測試商品2","price":200}'),
-- (2, 'product', 1, '{"id":1,"name":"測試商品","price":100}');

-- 查詢統計
-- SELECT 
--     item_type,
--     COUNT(*) as total_favorites,
--     COUNT(DISTINCT user_id) as unique_users
-- FROM user_favorites 
-- GROUP BY item_type;

-- 查詢熱門商品（被收藏最多的）
-- SELECT 
--     item_id,
--     COUNT(*) as favorite_count
-- FROM user_favorites 
-- WHERE item_type = 'product'
-- GROUP BY item_id
-- ORDER BY favorite_count DESC
-- LIMIT 10;