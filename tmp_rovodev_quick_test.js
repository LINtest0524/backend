// 快速測試自動標籤 API
// const axios = require('axios'); // 先註解掉，因為沒有安裝

const BASE_URL = 'http://localhost:3000';

async function quickTest() {
  try {
    console.log('🔍 測試自動標籤 API...');
    
    // 假設你有一個測試用的 JWT token，請替換下面的 token
    const TOKEN = 'YOUR_JWT_TOKEN_HERE'; // 請替換為真實的 token
    
    // 如果沒有 token，可以先跳過 API 測試
    if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
      console.log('❌ 請先在腳本中設置有效的 JWT token');
      console.log('📋 可以透過以下步驟獲取 token：');
      console.log('1. 在瀏覽器開發者工具 Network 頁面');
      console.log('2. 登入後台系統');
      console.log('3. 查看任意 API 請求的 Authorization header');
      console.log('4. 複製 Bearer 後面的 token 值');
      return;
    }
    
    // 測試檢查自動標籤狀態（假設用戶 ID 是 1，請根據實際情況調整）
    const userId = 1;
    
    const response = await axios.get(`${BASE_URL}/user/${userId}/auto-tag-status`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log('📊 自動標籤狀態:', JSON.stringify(response.data, null, 2));
    
    // 手動觸發自動標籤
    const applyResponse = await axios.post(`${BASE_URL}/user/${userId}/apply-auto-tags`, {}, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log('🔄 手動觸發結果:', JSON.stringify(applyResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.response?.data || error.message);
  }
}

// 直接檢查資料庫連接和標籤設置的函數
function showDatabaseQueries() {
  console.log('='.repeat(60));
  console.log('📋 請在資料庫中手動執行以下查詢來檢查問題：');
  console.log('='.repeat(60));
  
  console.log('\n1️⃣ 檢查最新通過驗證的會員：');
  console.log(`
SELECT 
    u.id, u.username, u.company_id, u.id_verified, u.id_verified_at
FROM "user" u 
WHERE u.id_verified = true 
ORDER BY u.id_verified_at DESC NULLS LAST 
LIMIT 5;
  `);
  
  console.log('\n2️⃣ 檢查標籤 5 是否存在：');
  console.log(`
SELECT id, name, company_id FROM marquee_tag WHERE id = 5;
  `);
  
  console.log('\n3️⃣ 檢查自動標籤規則：');
  console.log(`
SELECT * FROM auto_tag_rules WHERE trigger_field = 'id_verified';
  `);
  
  console.log('\n4️⃣ 檢查會員的現有標籤：');
  console.log(`
SELECT 
    u.username, ut.tag_id, mt.name, ut."createdAt"
FROM user_tag ut
JOIN "user" u ON ut.user_id = u.id
JOIN marquee_tag mt ON ut.tag_id = mt.id
WHERE u.id_verified = true
ORDER BY u.username, ut.tag_id;
  `);
  
  console.log('\n5️⃣ 如果標籤 5 不存在，創建它：');
  console.log(`
INSERT INTO marquee_tag (id, name, backgroundColor, textColor, shape, company_id, created_at, updated_at)
VALUES (5, '身分證通過', '#10B981', '#FFFFFF', 'rectangle', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
  `);
  
  console.log('\n6️⃣ 如果自動標籤規則不存在，創建它：');
  console.log(`
INSERT INTO auto_tag_rules (tag_id, trigger_field, trigger_value, condition_type, description, company_id, is_active, created_at, updated_at)
VALUES (5, 'id_verified', 'true', 'EQUALS', '身分證驗證通過自動添加標籤', 1, true, NOW(), NOW())
ON CONFLICT DO NOTHING;
  `);
  
  console.log('\n='.repeat(60));
}

// 執行
console.log('🚀 自動標籤系統快速診斷工具');
console.log('');

showDatabaseQueries();

console.log('\n📱 如果要測試 API，請先設置 JWT token 後再執行：');
console.log('quickTest();');

// 如果有 token，取消下面這行的註解
// quickTest();