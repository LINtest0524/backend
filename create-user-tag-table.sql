-- 建立會員標籤關聯表
CREATE TABLE user_tag (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
    FOREIGN KEY ("tagId") REFERENCES marquee_tag(id) ON DELETE CASCADE,
    UNIQUE("userId", "tagId")  -- 防止重複關聯
);

-- 建立索引提升查詢效能
CREATE INDEX idx_user_tag_user_id ON user_tag("userId");
CREATE INDEX idx_user_tag_tag_id ON user_tag("tagId");

-- 建立註解說明表格用途
COMMENT ON TABLE user_tag IS '會員標籤關聯表';
COMMENT ON COLUMN user_tag."userId" IS '會員ID';
COMMENT ON COLUMN user_tag."tagId" IS '標籤ID';
COMMENT ON COLUMN user_tag."createdAt" IS '建立時間';