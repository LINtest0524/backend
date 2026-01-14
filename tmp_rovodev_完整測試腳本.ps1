# GSC+ API 完整自動測試腳本
# 這個腳本會自動測試所有的 API 端點

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GSC+ API 自動測試腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$baseUrl = "http://localhost:3001"
$operatorCode = "T9H1"
$secretKey = "GSiBLVjYwuk2BtB2VAuuo7"
$testUser = "eeeaaa"  # 您可以改成任何現有的用戶名

# 獲取當前時間戳（秒）
$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()

Write-Host "配置資訊:" -ForegroundColor Yellow
Write-Host "  Base URL: $baseUrl"
Write-Host "  Operator Code: $operatorCode"
Write-Host "  Test User: $testUser"
Write-Host "  Request Time: $requestTime"
Write-Host ""

# 計算 MD5 簽名的函數
function Get-MD5Hash {
    param([string]$text)
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $hash = $md5.ComputeHash($bytes)
    return [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

# ==========================================
# 測試 1: Balance API (查詢餘額)
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "測試 1: Balance API (查詢餘額)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$signString = "$operatorCode$requestTime" + "getbalance" + "$secretKey"
$sign = Get-MD5Hash $signString

Write-Host "簽名字串: $signString"
Write-Host "MD5 簽名: $sign"
Write-Host ""

$balanceJson = @"
{
  "operator_code": "$operatorCode",
  "currency": "TWD",
  "sign": "$sign",
  "request_time": "$requestTime",
  "batch_requests": [
    {
      "member_account": "$testUser",
      "product_code": 1006
    }
  ]
}
"@

Write-Host "發送請求到: $baseUrl/v1/api/seamless/balance" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/balance" -Method POST -ContentType "application/json" -Body $balanceJson
    Write-Host "✅ 回應成功:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    # 檢查結果
    $code = $response.data[0].code
    if ($code -eq 0) {
        Write-Host "✅ Balance API 測試成功！用戶餘額: $($response.data[0].balance) 元" -ForegroundColor Green
        $userBalance = $response.data[0].balance
    } elseif ($code -eq 1000) {
        Write-Host "⚠️  用戶不存在，請先建立測試用戶" -ForegroundColor Yellow
        Write-Host "   執行: tmp_rovodev_create_test_user.sql" -ForegroundColor Yellow
        exit
    } else {
        Write-Host "❌ 錯誤碼: $code, 訊息: $($response.data[0].message)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "❌ 請求失敗:" -ForegroundColor Red
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   詳細: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

Write-Host ""
Start-Sleep -Seconds 2

# ==========================================
# 測試 2: Withdraw API (扣款/下注)
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "測試 2: Withdraw API (扣款 10 元)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 重新獲取時間戳（避免時間差）
$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()
$signString = "$operatorCode$requestTime" + "withdraw" + "$secretKey"
$sign = Get-MD5Hash $signString

$transactionId = "txn_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$wagerCode = "wager_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$roundId = "round_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

Write-Host "簽名字串: $signString"
Write-Host "MD5 簽名: $sign"
Write-Host "交易 ID: $transactionId"
Write-Host ""

$withdrawJson = @"
{
  "operator_code": "$operatorCode",
  "currency": "TWD",
  "sign": "$sign",
  "request_time": "$requestTime",
  "batch_requests": [
    {
      "member_account": "$testUser",
      "product_code": 1006,
      "game_type": "SLOT",
      "transactions": [
        {
          "id": "$transactionId",
          "action": "bet",
          "wager_code": "$wagerCode",
          "wager_status": "BET",
          "round_id": "$roundId",
          "channel_code": "gscp",
          "amount": 10,
          "bet_amount": 10,
          "valid_bet_amount": 10,
          "prize_amount": 0,
          "tip_amount": 0,
          "settled_at": 0,
          "game_code": "vs20olympgate",
          "wager_type": "NORMAL"
        }
      ]
    }
  ]
}
"@

Write-Host "發送請求到: $baseUrl/v1/api/seamless/withdraw" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/withdraw" -Method POST -ContentType "application/json" -Body $withdrawJson
    Write-Host "✅ 回應成功:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    $code = $response.data[0].code
    if ($code -eq 0) {
        Write-Host "✅ Withdraw API 測試成功！" -ForegroundColor Green
        Write-Host "   扣款前: $($response.data[0].before_balance) 元" -ForegroundColor Green
        Write-Host "   扣款後: $($response.data[0].balance) 元" -ForegroundColor Green
        $newBalance = $response.data[0].balance
    } elseif ($code -eq 1001) {
        Write-Host "⚠️  餘額不足" -ForegroundColor Yellow
        exit
    } else {
        Write-Host "❌ 錯誤碼: $code, 訊息: $($response.data[0].message)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "❌ 請求失敗:" -ForegroundColor Red
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   詳細: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

Write-Host ""
Start-Sleep -Seconds 2

# ==========================================
# 測試 3: Deposit API (加款/派彩)
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "測試 3: Deposit API (加款 20 元)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()
$signString = "$operatorCode$requestTime" + "deposit" + "$secretKey"
$sign = Get-MD5Hash $signString

$transactionId2 = "txn_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + "_2"
$settledAt = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

Write-Host "簽名字串: $signString"
Write-Host "MD5 簽名: $sign"
Write-Host "交易 ID: $transactionId2"
Write-Host ""

$depositJson = @"
{
  "operator_code": "$operatorCode",
  "currency": "TWD",
  "sign": "$sign",
  "request_time": "$requestTime",
  "batch_requests": [
    {
      "member_account": "$testUser",
      "product_code": 1006,
      "game_type": "SLOT",
      "transactions": [
        {
          "id": "$transactionId2",
          "action": "settled",
          "wager_code": "$wagerCode",
          "wager_status": "SETTLED",
          "round_id": "$roundId",
          "channel_code": "gscp",
          "amount": 20,
          "bet_amount": 10,
          "valid_bet_amount": 10,
          "prize_amount": 20,
          "tip_amount": 0,
          "settled_at": $settledAt,
          "game_code": "vs20olympgate",
          "wager_type": "NORMAL"
        }
      ]
    }
  ]
}
"@

Write-Host "發送請求到: $baseUrl/v1/api/seamless/deposit" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/deposit" -Method POST -ContentType "application/json" -Body $depositJson
    Write-Host "✅ 回應成功:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    $code = $response.data[0].code
    if ($code -eq 0) {
        Write-Host "✅ Deposit API 測試成功！" -ForegroundColor Green
        Write-Host "   加款前: $($response.data[0].before_balance) 元" -ForegroundColor Green
        Write-Host "   加款後: $($response.data[0].balance) 元" -ForegroundColor Green
        Write-Host "   淨賺: +$(20 - 10) 元" -ForegroundColor Green
    } else {
        Write-Host "❌ 錯誤碼: $code, 訊息: $($response.data[0].message)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "❌ 請求失敗:" -ForegroundColor Red
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   詳細: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

Write-Host ""
Start-Sleep -Seconds 2

# ==========================================
# 測試 4: Push Bet Data API (推送注單)
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "測試 4: Push Bet Data API (推送注單)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()
$signString = "$operatorCode$requestTime" + "pushbetdata" + "$secretKey"
$sign = Get-MD5Hash $signString

Write-Host "簽名字串: $signString"
Write-Host "MD5 簽名: $sign"
Write-Host ""

$pushBetDataJson = @"
{
  "operator_code": "$operatorCode",
  "sign": "$sign",
  "request_time": "$requestTime",
  "wagers": [
    {
      "member_account": "$testUser",
      "bet_amount": 10,
      "valid_bet_amount": 10,
      "prize_amount": 20,
      "tip_amount": 0,
      "wager_type": "NORMAL",
      "wager_code": "$wagerCode",
      "wager_status": "SETTLED",
      "round_id": "$roundId",
      "channel_code": "gscp",
      "game_type": "SLOT",
      "settled_at": $settledAt,
      "created_at": $([DateTimeOffset]::Now.ToUnixTimeMilliseconds() - 60000),
      "payload": {},
      "product_code": "1006",
      "game_code": "vs20olympgate",
      "currency": "TWD"
    }
  ]
}
"@

Write-Host "發送請求到: $baseUrl/v1/api/seamless/pushbetdata" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/pushbetdata" -Method POST -ContentType "application/json" -Body $pushBetDataJson
    Write-Host "✅ 回應成功:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.code -eq 0) {
        Write-Host "✅ Push Bet Data API 測試成功！" -ForegroundColor Green
    } else {
        Write-Host "❌ 錯誤碼: $($response.code), 訊息: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 請求失敗:" -ForegroundColor Red
    Write-Host "   錯誤: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   詳細: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  測試完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "請檢查:" -ForegroundColor Yellow
Write-Host "  1. 用戶餘額是否正確變化" -ForegroundColor Yellow
Write-Host "  2. wallet_transactions 資料表是否有記錄" -ForegroundColor Yellow
Write-Host "  3. game_wagers 資料表是否有注單記錄" -ForegroundColor Yellow
Write-Host ""
