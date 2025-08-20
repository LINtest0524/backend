import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

export interface EcpayConfig {
  merchantId: string
  hashKey: string
  hashIV: string
  returnUrl: string
  clientBackUrl: string
  orderResultUrl: string
  isProduction: boolean
}

export interface EcpayOrderData {
  merchantTradeNo: string
  merchantTradeDate: string
  totalAmount: number
  tradeDesc: string
  itemName: string
  returnUrl: string
  clientBackUrl: string
  orderResultUrl: string
  choosePayment: string
  encryptType: number
}

@Injectable()
export class EcpayService {
  private readonly config: EcpayConfig

  constructor() {
    // 綠界測試環境設定
    this.config = {
      merchantId: '3002599',
      hashKey: 'spPjZn66i0OhqJsQ',
      hashIV: 'hT5OJckN45isQTTs',
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/ecpay/return`,
      clientBackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/a/orders`,
      orderResultUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/ecpay/result`,
      isProduction: false
    }
  }

  /**
   * 取得綠界 API URL
   */
  private getApiUrl(): string {
    return this.config.isProduction
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
  }

  /**
   * 產生檢查碼
   */
  private generateCheckMacValue(params: Record<string, any>): string {
    // 1. 將參數依照 key 排序
    const sortedKeys = Object.keys(params).sort()
    
    // 2. 組成字串
    let checkStr = `HashKey=${this.config.hashKey}`
    for (const key of sortedKeys) {
      if (key !== 'CheckMacValue') {
        checkStr += `&${key}=${params[key]}`
      }
    }
    checkStr += `&HashIV=${this.config.hashIV}`

    // 3. URL encode
    checkStr = encodeURIComponent(checkStr)
    
    // 4. 轉小寫
    checkStr = checkStr.toLowerCase()
    
    // 5. 特殊字元處理
    checkStr = checkStr
      .replace(/%2d/g, '-')
      .replace(/%5f/g, '_')
      .replace(/%2e/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2a/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')')
      .replace(/%20/g, '+')

    // 6. SHA256 加密並轉大寫
    return crypto.createHash('sha256').update(checkStr).digest('hex').toUpperCase()
  }

  /**
   * 產生綠界訂單編號
   */
  private generateMerchantTradeNo(): string {
    const now = new Date()
    const timestamp = now.getTime().toString()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EC${timestamp}${random}`.substring(0, 20) // 綠界限制 20 字元
  }

  /**
   * 格式化交易日期
   */
  private formatTradeDate(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    const seconds = now.getSeconds().toString().padStart(2, '0')
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  }

  /**
   * 建立綠界付款表單資料
   */
  createPaymentForm(orderData: {
    orderId: string
    totalAmount: number
    itemNames: string[]
    paymentMethod?: string
  }): { action: string; params: Record<string, any> } {
    const merchantTradeNo = this.generateMerchantTradeNo()
    const merchantTradeDate = this.formatTradeDate()
    
    // 商品名稱處理（綠界限制 400 字元）
    let itemName = orderData.itemNames.join('#')
    if (itemName.length > 400) {
      itemName = itemName.substring(0, 397) + '...'
    }

    // 基本參數
    const params: Record<string, any> = {
      MerchantID: this.config.merchantId,
      MerchantTradeNo: merchantTradeNo,
      MerchantTradeDate: merchantTradeDate,
      PaymentType: 'aio',
      TotalAmount: Math.round(orderData.totalAmount),
      TradeDesc: `訂單編號: ${orderData.orderId}`,
      ItemName: itemName,
      ReturnURL: this.config.returnUrl,
      ClientBackURL: this.config.clientBackUrl,
      OrderResultURL: this.config.orderResultUrl,
      ChoosePayment: 'ALL', // 預設顯示所有付款方式
      EncryptType: 1,
      // 額外參數
      CustomField1: orderData.orderId, // 存放我們的訂單 ID
      CustomField2: '', 
      CustomField3: '',
      CustomField4: ''
    }

    // 根據付款方式設定特定參數
    switch (orderData.paymentMethod) {
      case 'credit_card':
        params.ChoosePayment = 'Credit'
        break
      case 'atm':
        params.ChoosePayment = 'ATM'
        params.ExpireDate = 3 // ATM 繳費期限 3 天
        break
      case 'cvs':
        params.ChoosePayment = 'CVS'
        params.StoreExpireDate = 10080 // 超商繳費期限 7 天 (分鐘)
        break
      case 'barcode':
        params.ChoosePayment = 'BARCODE'
        params.StoreExpireDate = 10080
        break
      default:
        params.ChoosePayment = 'ALL'
    }

    // 產生檢查碼
    params.CheckMacValue = this.generateCheckMacValue(params)

    return {
      action: this.getApiUrl(),
      params
    }
  }

  /**
   * 驗證綠界回傳的檢查碼
   */
  verifyCheckMacValue(params: Record<string, any>): boolean {
    const receivedCheckMacValue = params.CheckMacValue
    const calculatedCheckMacValue = this.generateCheckMacValue(params)
    
    return receivedCheckMacValue === calculatedCheckMacValue
  }

  /**
   * 解析綠界回傳結果
   */
  parseReturnData(params: Record<string, any>): {
    isSuccess: boolean
    orderId: string
    merchantTradeNo: string
    tradeNo: string
    tradeAmt: number
    paymentDate: string
    paymentType: string
    rtnCode: number
    rtnMsg: string
  } {
    console.log('解析綠界回傳參數:', params)
    
    const result = {
      isSuccess: params.RtnCode === '1',
      orderId: params.CustomField1 || '',
      merchantTradeNo: params.MerchantTradeNo || '',
      tradeNo: params.TradeNo || '',
      tradeAmt: parseInt(params.TradeAmt) || 0,
      paymentDate: params.PaymentDate || '',
      paymentType: params.PaymentType || '',
      rtnCode: parseInt(params.RtnCode) || 0,
      rtnMsg: params.RtnMsg || ''
    }
    
    console.log('解析後的結果:', result)
    
    // 檢查關鍵欄位
    if (!result.orderId) {
      console.error('警告: orderId 為空，CustomField1:', params.CustomField1)
    }
    
    return result
  }
}