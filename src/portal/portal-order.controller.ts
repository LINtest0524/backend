import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common'
import { OrderService } from '../order/order.service'
import { CreateOrderDto } from '../order/dto/create-order.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('portal/orders')
export class PortalOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    // 傳入登入用戶的 ID
    const userId = req.user.id
    return this.orderService.create(createOrderDto, userId)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findUserOrders(
    @Request() req,
    @Query('company') company: string
  ) {
    return this.orderService.findByUser(req.user.id, company)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Request() req, @Query('company') company: string) {
    const orders = await this.orderService.findByUser(req.user.id, company)
    return orders.find(order => order.id === +req.params.id)
  }

  @Get(':id/company')
  async getOrderCompany(@Request() req) {
    // 這個 API 專門用於綠界回傳時查詢訂單的公司代碼，不需要認證
    const orderId = +req.params.id
    const order = await this.orderService.findOne(orderId)
    
    if (!order) {
      throw new Error('訂單不存在')
    }
    
    return { company: order.company }
  }
}