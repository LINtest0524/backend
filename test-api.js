// 測試 API 端點的簡單腳本
// 在 backend 目錄下執行: node test-api.js

const http = require('http');

function testAPI(path, callback) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`\n=== ${path} ===`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      try {
        const jsonData = JSON.parse(data);
        console.log('Response:', JSON.stringify(jsonData, null, 2));
      } catch (e) {
        console.log('Raw Response:', data);
      }
      
      if (callback) callback();
    });
  });

  req.on('error', (e) => {
    console.error(`請求錯誤: ${e.message}`);
    if (callback) callback();
  });

  req.end();
}

// 測試分類 API
console.log('測試商品分類 API...');
testAPI('/portal/product/categories?company=a', () => {
  // 測試商品 API
  console.log('\n測試商品 API...');
  testAPI('/portal/product?company=a&limit=5');
});