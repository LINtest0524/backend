import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common'
import { OrderService } from './order.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async findAll(
    @Request() req: any,
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
    // 權限檢查：代理商只能查看自己公司的訂單
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      // 代理商只能查看自己公司的訂單，忽略前端傳來的 company 參數
      company = userCompanyId.toString();
    }
    
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
  async findOne(@Request() req: any, @Param('id') id: string) {
    const order = await this.orderService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能查看自己公司的訂單
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (order.company !== userCompanyId.toString()) {
        throw new Error('無權限訪問此訂單');
      }
    }
    
    return order;
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    const order = await this.orderService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的訂單
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (order.company !== userCompanyId.toString()) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updateStatus(+id, status)
  }

  @Patch(':id/payment-status')
  async updatePaymentStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('payment_status') paymentStatus: string
  ) {
    const order = await this.orderService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的訂單
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (order.company !== userCompanyId.toString()) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updatePaymentStatus(+id, paymentStatus)
  }

  @Patch(':id/shipping-status')
  async updateShippingStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('shipping_status') shippingStatus: string
  ) {
    const order = await this.orderService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的訂單
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (order.company !== userCompanyId.toString()) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updateShippingStatus(+id, shippingStatus)
  }

  @Patch(':id/notes')
  async updateAdminNotes(
    @Request() req: any,
    @Param('id') id: string,
    @Body('admin_notes') adminNotes: string
  ) {
    const order = await this.orderService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的訂單
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (order.company !== userCompanyId.toString()) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updateAdminNotes(+id, adminNotes)
  }
}