# GSC+ Callback API 測試指南

這份文件將教您如何測試 GSC+ 遊戲供應商的 Callback API。

## 📋 前置準備

### 1. 確保服務正在運行
```powershell
# 在 Project/backend 目錄下啟動服務
npm run start:dev
```

### 2. 建立測試用戶
在資料庫中建立一個測試用戶：
```sql
-- 假設您的測試用戶是 test_user
-- 確保這個用戶已經存在於 users 資料表中
SELECT id, username, balance FROM users WHERE username = 'test_user';
```

如果不存在，請先建立測試用戶。

---

## 🔧 測試方法

### 方法 1: 使用 Node.js 腳本（推薦）

#### 步驟 1: 生成簽名
```powershell
cd Project\backend
node tmp_rovodev_test_gsc_signature.js
```

這會顯示：
- 當前時間戳
- 各個 API 的 MD5 簽名
- 完整的測試 JSON

#### 步驟 2: 使用 curl 或 Postman 測試

**使用 PowerShell (curl):**

```powershell
# 1. 測試 Balance API
$balanceJson = @"
{
  "operator_code": "T9H1",
  "currency": "TWD",
  "sign": "從腳本複製的簽名",
  "request_time": "從腳本複製的時間戳",
  "batch_requests": [
    {
      "member_account": "test_user",
      "product_code": 1006
    }
  ]
}
"@

Invoke-RestMethod -Uri "http://localhost:3000/v1/api/seamless/balance" `
  -Method POST `
  -ContentType "application/json" `
  -Body $balanceJson
```

---

### 方法 2: 使用 VS Code REST Client 擴充套件

#### 步驟 1: 安裝擴充套件
在 VS Code 中搜尋並安裝 "REST Client" 擴充套件。

#### 步驟 2: 使用測試檔案
開啟 `test-gsc-callback-api.http` 檔案，手動填入簽名後點擊 `Send Request`。

---

### 方法 3: 使用 Postman

#### 步驟 1: 建立新的 Request
- Method: POST
- URL: `http://localhost:3000/api/game-provider-gsc/seamless/balance`
- Headers: `Content-Type: application/json`

#### 步驟 2: 設定 Body
```json
{
  "operator_code": "T9H1",
  "currency": "TWD",
  "sign": "從腳本複製的簽名",
  "request_time": "從腳本複製的時間戳",
  "batch_requests": [
    {
      "member_account": "test_user",
      "product_code": 1006
    }
  ]
}
```

---

## 🧪 測試流程

### 1️⃣ 測試 Balance API (查詢餘額)

**預期結果：**
```json
{
  "data": [
    {
      "member_account": "test_user",
      "product_code": 1006,
      "balance": 1000.0,
      "code": 0,
      "message": ""
    }
  ]
}
```

**可能的錯誤：**
- `code: 1000` - 用戶不存在
- `code: 1004` - 簽名無效
- `code: 1002` - Operator Code 錯誤

---

### 2️⃣ 測試 Withdraw API (扣款)

**測試情境：玩家下注 10 元**

執行腳本後複製 Withdraw JSON，發送請求。

**預期結果：**
```json
{
  "data": [
    {
      "member_account": "test_user",
      "product_code": 1006,
      "before_balance": 1000.0,
      "balance": 990.0,
      "code": 0,
      "message": ""
    }
  ]
}
```

**檢查資料庫：**
```sql
-- 檢查用戶餘額是否減少
SELECT username, balance FROM users WHERE username = 'test_user';

-- 檢查交易記錄
SELECT * FROM wallet_transactions 
WHERE user_id = (SELECT id FROM users WHERE username = 'test_user')
ORDER BY created_at DESC LIMIT 5;
```

---

### 3️⃣ 測試 Deposit API (加款)

**測試情境：玩家贏得 20 元**

修改腳本中的 Deposit 部分，執行並發送請求。

**預期結果：**
```json
{
  "data": [
    {
      "member_account": "test_user",
      "product_code": 1006,
      "before_balance": 990.0,
      "balance": 1010.0,
      "code": 0,
      "message": ""
    }
  ]
}
```

---

### 4️⃣ 測試 Push Bet Data API (推送注單)

**測試情境：同步注單資料**

**預期結果：**
```json
{
  "code": 0,
  "message": ""
}
```

**檢查資料庫：**
```sql
-- 檢查注單是否已保存
SELECT * FROM game_wagers 
WHERE wager_code LIKE 'wager_%'
ORDER BY created_at DESC LIMIT 5;
```

---

## 🐛 常見錯誤排查

### 錯誤 1: `code: 1004` - 簽名無效

**原因：**
- 簽名計算錯誤
- `request_time` 不一致

**解決方法：**
1. 使用腳本重新生成簽名
2. 確保 `request_time` 與簽名計算時使用的相同
3. 檢查 `secret_key` 是否正確

---

### 錯誤 2: `code: 1000` - 用戶不存在

**原因：**
- 資料庫中沒有該用戶

**解決方法：**
```sql
-- 建立測試用戶 (示例)
INSERT INTO users (username, password, balance, company_id, role)
VALUES ('test_user', 'hashed_password', 100000, 1, 'USER');
```

---

### 錯誤 3: `code: 1001` - 餘額不足

**原因：**
- 用戶餘額不夠扣款

**解決方法：**
```sql
-- 增加測試用戶餘額
UPDATE users 
SET balance = 100000 
WHERE username = 'test_user';
```

---

## 📊 測試檢查清單

- [ ] Balance API 可以正常查詢餘額
- [ ] Withdraw API 可以正常扣款，餘額減少
- [ ] Deposit API 可以正常加款，餘額增加
- [ ] Push Bet Data API 可以正常保存注單
- [ ] 資料庫中的 `wallet_transactions` 有正確記錄
- [ ] 資料庫中的 `game_wagers` 有正確記錄
- [ ] 簽名驗證正常運作
- [ ] 錯誤處理正常（用戶不存在、餘額不足等）

---

## 🚀 下一步

測試完成後，您可以：

1. **連接真實的遊戲廠商測試環境**
   - 將您的 callback URL 提供給 GSC+
   - 使用他們的測試環境進行整合測試

2. **實作缺少的功能**
   - 交易冪等性檢查（`findByReferenceId`）
   - 專用的遊戲餘額更新方法
   - 更完善的錯誤處理

3. **壓力測試**
   - 測試併發請求
   - 測試大量注單

有任何問題隨時問我！
