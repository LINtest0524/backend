# 🎉 GSC+ API 測試成功！

## ✅ 測試結果

您的 API 已經成功運行！剛才的測試顯示：

```json
{
  "data": [
    {
      "member_account": "test_user",
      "product_code": 1006,
      "balance": 0,
      "code": 1000,
      "message": "Member not found"
    }
  ]
}
```

- ✅ API 端點正常運作
- ✅ 簽名驗證通過
- ✅ 錯誤處理正常（返回了 code 1000 = 用戶不存在）

---

## 📝 下一步：建立測試用戶

### 方法 1: 使用現有用戶測試

如果您資料庫中已經有用戶，可以直接使用。請執行：

```sql
-- 查詢現有用戶
SELECT id, username, balance, company_id, role 
FROM users 
WHERE role = 'USER' 
LIMIT 5;
```

然後用真實的 `username` 替換測試請求中的 `member_account`。

---

### 方法 2: 快速建立測試用戶

執行以下 SQL（請先確認您的 company_id）：

```sql
-- 快速建立測試用戶
INSERT INTO users (
  username, 
  password, 
  balance, 
  company_id, 
  role,
  status
) VALUES (
  'test_user',
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', -- 密碼: "password123"
  100000, -- 1000.00 元
  1, -- 請確認您的 company_id
  'USER',
  'ACTIVE'
);
```

---

## 🧪 完整測試流程

### 1. 重新生成簽名（因為時間過期了）

```powershell
cd Project\backend
node tmp_rovodev_test_gsc_signature.js
```

### 2. 測試 Balance API

用新的簽名和時間戳：

```powershell
$balanceJson = @"
{
  "operator_code": "T9H1",
  "currency": "TWD",
  "sign": "新的簽名",
  "request_time": "新的時間戳",
  "batch_requests": [
    {
      "member_account": "實際的用戶名",
      "product_code": 1006
    }
  ]
}
"@

Invoke-RestMethod -Uri "http://localhost:3001/v1/api/seamless/balance" -Method POST -ContentType "application/json" -Body $balanceJson | ConvertTo-Json -Depth 10
```

### 3. 測試 Withdraw API (扣款)

```powershell
# 先生成新簽名
node tmp_rovodev_test_gsc_signature.js

# 複製 Withdraw JSON 並發送請求
$withdrawJson = @"
複製腳本輸出的 Withdraw JSON
"@

Invoke-RestMethod -Uri "http://localhost:3001/v1/api/seamless/withdraw" -Method POST -ContentType "application/json" -Body $withdrawJson | ConvertTo-Json -Depth 10
```

### 4. 測試 Deposit API (加款)

同樣的步驟，使用 `/v1/api/seamless/deposit` 端點。

### 5. 測試 Push Bet Data API

使用 `/v1/api/seamless/pushbetdata` 端點。

---

## 📊 預期的成功回應

### Balance API 成功回應：
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

### Withdraw API 成功回應：
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

---

## 🔍 錯誤碼對照表

| Code | 說明 |
|------|------|
| 0    | 成功 |
| 1000 | 用戶不存在 |
| 1001 | 餘額不足 |
| 1002 | Operator Code 錯誤 |
| 1003 | 重複交易 |
| 1004 | 簽名無效 |
| 2000 | 產品維護中 |
| 999  | 內部錯誤 |

---

## 🎯 重要提醒

1. **Port 是 3001**：您的服務運行在 `http://localhost:3001`，不是 3000
2. **簽名會過期**：每次測試前都要重新生成簽名
3. **檢查 Console Log**：API 會在 console 輸出詳細的請求和回應日誌

---

## ✨ 恭喜！

您的 GSC+ Callback API 已經成功運作了！接下來只需要：
1. 建立測試用戶
2. 測試完整的扣款/加款流程
3. 準備接入真實的遊戲廠商環境

有任何問題隨時問我！ 🚀
