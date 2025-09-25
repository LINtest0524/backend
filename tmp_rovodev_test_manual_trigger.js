// 手動測試自動標籤觸發
const http = require('http');

// 測試後端 API 是否正常工作
function testAPI() {
  console.log('🔍 測試後端服務是否正常運行...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/user',  // 簡單的健康檢查
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`✅ 後端服務狀態: ${res.statusCode}`);
    if (res.statusCode === 401) {
      console.log('✅ 後端正常運行（需要認證）');
    } else if (res.statusCode === 200) {
      console.log('✅ 後端正常運行');
    }
    
    console.log('\n📋 診斷建議：');
    console.log('1. 檢查後端終端機是否有錯誤訊息');
    console.log('2. 確認身分證審核時是否有日誌輸出');
    console.log('3. 檢查資料庫連接是否正常');
    console.log('4. 手動執行 SQL 修復腳本');
    
    console.log('\n🔧 手動觸發步驟：');
    console.log('1. 先執行 tmp_rovodev_simple_fix.sql');
    console.log('2. 檢查是否有標籤 ID 5 和自動標籤規則');
    console.log('3. 重新啟動後端服務');
    console.log('4. 重新測試身分證審核');
  });

  req.on('error', (e) => {
    console.error(`❌ 後端服務無法連接: ${e.message}`);
    console.log('\n📋 請確認：');
    console.log('1. 後端服務是否正在運行？');
    console.log('2. 端口 3000 是否正確？');
  });

  req.end();
}

// 顯示診斷資訊
function showDiagnosticInfo() {
  console.log('🚀 自動標籤問題診斷');
  console.log('='.repeat(50));
  
  console.log('\n📊 問題現象：');
  console.log('- 身分證驗證審核通過');
  console.log('- user_tag 表仍然是空的');
  console.log('- 前端沒有顯示標籤');
  
  console.log('\n🔍 可能原因：');
  console.log('1. 自動標籤邏輯沒有被觸發');
  console.log('2. 標籤 ID 5 不存在');
  console.log('3. 自動標籤規則不存在');
  console.log('4. 程式碼修改沒有生效（需要重啟）');
  console.log('5. 資料庫連接問題');
  
  console.log('\n⚠️  關鍵檢查點：');
  console.log('📝 後端終端機中是否出現以下日誌？');
  console.log('   - "✅ 身分證驗證通過 - 用戶: xxx"');
  console.log('   - "🏷️ 已為用戶 xxx 應用自動標籤"');
  console.log('   - "✅ 成功添加標籤 5 給使用者 xxx"');
  
  console.log('\n🔧 解決步驟：');
  console.log('1. 先執行 SQL 修復腳本確保基礎設置正確');
  console.log('2. 重啟後端服務讓程式碼修改生效');
  console.log('3. 重新測試身分證審核流程');
  console.log('4. 觀察後端日誌輸出');
}

// 執行診斷
showDiagnosticInfo();
console.log('\n📡 測試後端連接...');
testAPI();