import { Controller, Post, Body, Get, Query, Res, Req, HttpStatus } from '@nestjs/common'
import { Response, Request } from 'express'
import { EcpayService } from './ecpay.service'
import { OrderService } from '../order/order.service'

@Controller('ecpay')
export class EcpayController {
  constructor(
    private readonly ecpayService: EcpayService,
    private readonly orderService: OrderService
  ) {}

  /**
   * 建立綠界付款
   */
  @Post('create-payment')
  async createPayment(@Body() body: {
    orderId: number
    paymentMethod?: string
    company?: string
  }) {
    try {
      
      // 取得訂單資訊
      const order = await this.orderService.findOne(body.orderId)
      if (!order) {
        return {
          success: false,
          message: '訂單不存在'
        }
      }

      // 準備商品名稱列表
      const itemNames = order.items.map(item => 
        `${item.product_name}x${item.quantity}`
      )

      // 建立綠界付款表單
      const paymentForm = this.ecpayService.createPaymentForm({
        orderId: order.id.toString(),
        totalAmount: order.total_amount,
        itemNames,
        paymentMethod: body.paymentMethod,
        companyCode: order.company || body.company  // 優先使用訂單中的公司代碼
      })

      // 立即將綠界訂單編號儲存到訂單中
      await this.orderService.updateEcpayInfo(order.id, {
        merchantTradeNo: paymentForm.params.MerchantTradeNo
      })

      console.log(`訂單 ${order.id} 建立綠界付款，MerchantTradeNo: ${paymentForm.params.MerchantTradeNo}`)

      return {
        success: true,
        data: paymentForm
      }
    } catch (error) {
      console.error('建立綠界付款失敗:', error)
      return {
        success: false,
        message: '建立付款失敗'
      }
    }
  }

  /**
   * 綠界付款結果通知 (ReturnURL)
   */
  @Post('return')
  async handleReturn(@Body() body: any, @Res() res: Response) {
    try {
      console.log('綠界付款結果通知:', body)

      // 驗證檢查碼
      if (!this.ecpayService.verifyCheckMacValue(body)) {
        console.error('檢查碼驗證失敗')
        return res.status(HttpStatus.BAD_REQUEST).send('0|CheckMacValue驗證失敗')
      }

      // 解析回傳資料
      const result = this.ecpayService.parseReturnData(body)
      
      if (result.isSuccess) {
        // 更新訂單付款狀態
        await this.orderService.updatePaymentStatus(
          parseInt(result.orderId), 
          'paid'
        )
        
        // 更新訂單狀態
        await this.orderService.updateStatus(
          parseInt(result.orderId), 
          'paid'
        )

        // 儲存綠界交易資訊
        await this.orderService.updateEcpayInfo(parseInt(result.orderId), {
          merchantTradeNo: result.merchantTradeNo,
          tradeNo: result.tradeNo,
          paymentType: result.paymentType,
          paymentDate: result.paymentDate,
          returnData: body
        })

        console.log(`訂單 ${result.orderId} 付款成功`)
        return res.send('1|OK')
      } else {
        console.log(`訂單 ${result.orderId} 付款失敗: ${result.rtnMsg}`)
        
        // 更新訂單付款狀態為失敗
        await this.orderService.updatePaymentStatus(
          parseInt(result.orderId), 
          'failed'
        )

        // 儲存綠界交易資訊（即使失敗也要記錄）
        await this.orderService.updateEcpayInfo(parseInt(result.orderId), {
          merchantTradeNo: result.merchantTradeNo,
          returnData: body
        })
        
        return res.send('1|OK')
      }
    } catch (error) {
      console.error('處理綠界付款結果失敗:', error)
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('0|系統錯誤')
    }
  }

  /**
   * 綠界付款結果頁面 (OrderResultURL) - 只處理訂單狀態更新
   */
  @Post('result')
  async handleResult(@Body() body: any, @Res() res: Response) {
    try {
      console.log('綠界付款結果頁面 (後端處理):', body)

      // 驗證檢查碼
      if (!this.ecpayService.verifyCheckMacValue(body)) {
        console.error('檢查碼驗證失敗')
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: '檢查碼驗證失敗'
        })
      }

      // 解析回傳資料
      const result = this.ecpayService.parseReturnData(body)
      console.log('解析結果:', result)
      
      if (result.isSuccess) {
        // 檢查 orderId 是否存在
        if (!result.orderId) {
          console.error('付款成功但 orderId 為空')
          return res.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: '訂單ID遺失'
          })
        }
        
        // 更新訂單付款狀態
        await this.orderService.updatePaymentStatus(
          parseInt(result.orderId), 
          'paid'
        )
        
        // 更新訂單狀態
        await this.orderService.updateStatus(
          parseInt(result.orderId), 
          'paid'
        )

        // 儲存綠界交易資訊
        await this.orderService.updateEcpayInfo(parseInt(result.orderId), {
          merchantTradeNo: result.merchantTradeNo,
          tradeNo: result.tradeNo,
          paymentType: result.paymentType,
          paymentDate: result.paymentDate,
          returnData: body
        })

        console.log(`訂單 ${result.orderId} 付款成功，狀態已更新`)
        return res.json({
          success: true,
          message: '付款成功，訂單狀態已更新',
          orderId: result.orderId
        })
      } else {
        // 付款失敗，更新訂單狀態
        if (result.orderId) {
          await this.orderService.updatePaymentStatus(
            parseInt(result.orderId), 
            'failed'
          )

          // 儲存綠界交易資訊（即使失敗也要記錄）
          await this.orderService.updateEcpayInfo(parseInt(result.orderId), {
            merchantTradeNo: result.merchantTradeNo,
            returnData: body
          })
        }
        
        console.log(`訂單 ${result.orderId} 付款失敗: ${result.rtnMsg}`)
        return res.json({
          success: false,
          message: result.rtnMsg,
          orderId: result.orderId
        })
      }
    } catch (error) {
      console.error('處理綠界付款結果頁面失敗:', error)
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '系統錯誤'
      })
    }
  }

  /**
   * 查詢訂單付款狀態
   */
  @Get('payment-status/:orderId')
  async getPaymentStatus(@Query('orderId') orderId: string) {
    try {
      const order = await this.orderService.findOne(parseInt(orderId))
      if (!order) {
        return {
          success: false,
          message: '訂單不存在'
        }
      }

      return {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          paymentStatus: order.payment_status,
          status: order.status,
          totalAmount: order.total_amount
        }
      }
    } catch (error) {
      console.error('查詢付款狀態失敗:', error)
      return {
        success: false,
        message: '查詢失敗'
      }
    }
  }
}