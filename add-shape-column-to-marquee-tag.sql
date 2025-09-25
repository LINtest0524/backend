-- 新增 shape 欄位到 marquee_tag 表
ALTER TABLE marquee_tag ADD COLUMN shape VARCHAR(20) DEFAULT 'oval';

-- 更新現有記錄的 shape 為預設值
UPDATE marquee_tag SET shape = 'oval' WHERE shape IS NULL;

-- 建立註解說明欄位用途
COMMENT ON COLUMN marquee_tag.shape IS '標籤形狀: oval(橢圓形), pentagon(五邊形)';