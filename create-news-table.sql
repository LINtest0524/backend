-- 建立最新消息表
CREATE TABLE `news` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT '標題',
  `summary` text NOT NULL COMMENT '摘要',
  `content` longtext NOT NULL COMMENT '內容',
  `image_url` varchar(500) DEFAULT NULL COMMENT '圖片URL',
  `publish_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '發布時間',
  `status` enum('ACTIVE','INACTIVE','DRAFT') NOT NULL DEFAULT 'DRAFT' COMMENT '狀態',
  `category` enum('GENERAL','ANNOUNCEMENT','PROMOTION','UPDATE') NOT NULL DEFAULT 'GENERAL' COMMENT '分類',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '瀏覽次數',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否置頂',
  `companyId` int NOT NULL COMMENT '公司ID',
  `createdAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_NEWS_COMPANY` (`companyId`),
  KEY `IDX_NEWS_STATUS` (`status`),
  KEY `IDX_NEWS_PUBLISH_DATE` (`publish_date`),
  KEY `IDX_NEWS_CATEGORY` (`category`),
  KEY `IDX_NEWS_FEATURED` (`is_featured`),
  CONSTRAINT `FK_NEWS_COMPANY` FOREIGN KEY (`companyId`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='最新消息表';

-- 建立上傳目錄（需要手動建立）
-- mkdir -p public/uploads/news