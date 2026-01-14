# GSC+ API Auto Test Script
# This script will automatically test all API endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GSC+ API Auto Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3001"
$operatorCode = "T9H1"
$secretKey = "GSiBLVjYwuk2BtB2VAuuo7"
$testUser = "eeeaaa"  # Change this to your actual username

# Get current timestamp (seconds)
$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Base URL: $baseUrl"
Write-Host "  Operator Code: $operatorCode"
Write-Host "  Test User: $testUser"
Write-Host "  Request Time: $requestTime"
Write-Host ""

# Function to calculate MD5 hash
function Get-MD5Hash {
    param([string]$text)
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $hash = $md5.ComputeHash($bytes)
    return [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

# ==========================================
# Test 1: Balance API (Get Balance)
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "Test 1: Balance API (Get Balance)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$signString = "$operatorCode$requestTime" + "getbalance" + "$secretKey"
$sign = Get-MD5Hash $signString

Write-Host "Sign String: $signString"
Write-Host "MD5 Sign: $sign"
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

Write-Host "Sending request to: $baseUrl/v1/api/seamless/balance" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/balance" -Method POST -ContentType "application/json" -Body $balanceJson
    Write-Host "SUCCESS Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    # Check result
    $code = $response.data[0].code
    if ($code -eq 0) {
        Write-Host "SUCCESS Balance API test passed! User balance: $($response.data[0].balance) TWD" -ForegroundColor Green
        $userBalance = $response.data[0].balance
    } elseif ($code -eq 1000) {
        Write-Host "WARNING User not found, please create test user first" -ForegroundColor Yellow
        Write-Host "   Execute: tmp_rovodev_create_test_user.sql" -ForegroundColor Yellow
        exit
    } else {
        Write-Host "ERROR Code: $code, Message: $($response.data[0].message)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "ERROR Request failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

Write-Host ""
Start-Sleep -Seconds 2

# ==========================================
# Test 2: Withdraw API (Deduct/Bet)
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "Test 2: Withdraw API (Deduct 10 TWD)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Get new timestamp
$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()
$signString = "$operatorCode$requestTime" + "withdraw" + "$secretKey"
$sign = Get-MD5Hash $signString

$transactionId = "txn_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$wagerCode = "wager_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$roundId = "round_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

Write-Host "Sign String: $signString"
Write-Host "MD5 Sign: $sign"
Write-Host "Transaction ID: $transactionId"
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

Write-Host "Sending request to: $baseUrl/v1/api/seamless/withdraw" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/withdraw" -Method POST -ContentType "application/json" -Body $withdrawJson
    Write-Host "SUCCESS Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    $code = $response.data[0].code
    if ($code -eq 0) {
        Write-Host "SUCCESS Withdraw API test passed!" -ForegroundColor Green
        Write-Host "   Before: $($response.data[0].before_balance) TWD" -ForegroundColor Green
        Write-Host "   After: $($response.data[0].balance) TWD" -ForegroundColor Green
        $newBalance = $response.data[0].balance
    } elseif ($code -eq 1001) {
        Write-Host "WARNING Insufficient balance" -ForegroundColor Yellow
        exit
    } else {
        Write-Host "ERROR Code: $code, Message: $($response.data[0].message)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "ERROR Request failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

Write-Host ""
Start-Sleep -Seconds 2

# ==========================================
# Test 3: Deposit API (Add/Win)
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "Test 3: Deposit API (Add 20 TWD)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()
$signString = "$operatorCode$requestTime" + "deposit" + "$secretKey"
$sign = Get-MD5Hash $signString

$transactionId2 = "txn_" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + "_2"
$settledAt = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

Write-Host "Sign String: $signString"
Write-Host "MD5 Sign: $sign"
Write-Host "Transaction ID: $transactionId2"
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

Write-Host "Sending request to: $baseUrl/v1/api/seamless/deposit" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/deposit" -Method POST -ContentType "application/json" -Body $depositJson
    Write-Host "SUCCESS Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    $code = $response.data[0].code
    if ($code -eq 0) {
        Write-Host "SUCCESS Deposit API test passed!" -ForegroundColor Green
        Write-Host "   Before: $($response.data[0].before_balance) TWD" -ForegroundColor Green
        Write-Host "   After: $($response.data[0].balance) TWD" -ForegroundColor Green
        Write-Host "   Net Profit: +10 TWD" -ForegroundColor Green
    } else {
        Write-Host "ERROR Code: $code, Message: $($response.data[0].message)" -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "ERROR Request failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit
}

Write-Host ""
Start-Sleep -Seconds 2

# ==========================================
# Test 4: Push Bet Data API
# ==========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "Test 4: Push Bet Data API" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$requestTime = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "1970-01-01")).TotalSeconds).ToString()
$signString = "$operatorCode$requestTime" + "pushbetdata" + "$secretKey"
$sign = Get-MD5Hash $signString

Write-Host "Sign String: $signString"
Write-Host "MD5 Sign: $sign"
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

Write-Host "Sending request to: $baseUrl/v1/api/seamless/pushbetdata" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/v1/api/seamless/pushbetdata" -Method POST -ContentType "application/json" -Body $pushBetDataJson
    Write-Host "SUCCESS Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.code -eq 0) {
        Write-Host "SUCCESS Push Bet Data API test passed!" -ForegroundColor Green
    } else {
        Write-Host "ERROR Code: $($response.code), Message: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR Request failed:" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All Tests Completed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please check:" -ForegroundColor Yellow
Write-Host "  1. User balance changed correctly" -ForegroundColor Yellow
Write-Host "  2. wallet_transactions table has records" -ForegroundColor Yellow
Write-Host "  3. game_wagers table has wager records" -ForegroundColor Yellow
Write-Host ""
