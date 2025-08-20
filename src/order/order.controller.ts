import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common'
import { OrderService } from './order.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('admin/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async findAll(
    @Query('company') company: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('payment_method') paymentMethod?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('product_name') productName?: string
  ) {
    return this.orderService.findAll(company, page, limit, {
      status,
      search,
      paymentMethod,
      startDate,
      endDate,
      productName
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id)
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.orderService.updateStatus(+id, status)
  }

  @Patch(':id/payment-status')
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body('payment_status') paymentStatus: string
  ) {
    return this.orderService.updatePaymentStatus(+id, paymentStatus)
  }

  @Patch(':id/shipping-status')
  async updateShippingStatus(
    @Param('id') id: string,
    @Body('shipping_status') shippingStatus: string
  ) {
    return this.orderService.updateShippingStatus(+id, shippingStatus)
  }

  @Patch(':id/notes')
  async updateAdminNotes(
    @Param('id') id: string,
    @Body('admin_notes') adminNotes: string
  ) {
    return this.orderService.updateAdminNotes(+id, adminNotes)
  }
}