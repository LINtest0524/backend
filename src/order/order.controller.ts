import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request, Inject } from '@nestjs/common'
import { OrderService } from './order.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermission } from '../auth/permission.decorator'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Company } from '../company/company.entity'

@Controller('admin/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>
  ) {}

  @RequirePermission('orders.view')
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
    
    // 超級管理員和全域管理員可以查看所有公司訂單
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      // 代理商（一級到四級）和客服只能查看自己公司的訂單，忽略前端傳來的 company 參數
      if (userCompanyId) {
        // 動態查詢公司代碼
        const userCompany = await this.companyRepository.findOne({
          where: { id: userCompanyId }
        });
        if (userCompany) {
          company = userCompany.code;
        } else {
          company = 'default';
        }
      } else {
        return { data: [], total: 0 }; // 沒有公司ID就不能查詢訂單
      }
    }
    
    const result = await this.orderService.findAll(company, page, limit, {
      status,
      search,
      paymentMethod,
      startDate,
      endDate,
      productName
    });
    
    return result;
  }

  @RequirePermission('orders.view')
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const order = await this.orderService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能查看自己公司的訂單
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      let allowedCompany: string | null = null;
      if (userCompanyId) {
        const userCompany = await this.companyRepository.findOne({
          where: { id: userCompanyId }
        });
        allowedCompany = userCompany?.code || null;
      }
      
      if (!allowedCompany || order.company !== allowedCompany) {
        throw new Error('無權限訪問此訂單');
      }
    }
    
    return order;
  }

  @RequirePermission('orders.manage')
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
      // 動態路由：檢查用戶的公司ID與訂單的公司是否匹配
      const userCompany = await this.orderService.getUserCompany(userCompanyId);
      
      if (!userCompany || order.company !== userCompany.code) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updateStatus(+id, status)
  }

  @RequirePermission('orders.manage')
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
      // 動態路由：檢查用戶的公司ID與訂單的公司是否匹配
      const userCompany = await this.orderService.getUserCompany(userCompanyId);
      
      if (!userCompany || order.company !== userCompany.code) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updatePaymentStatus(+id, paymentStatus)
  }

  @RequirePermission('orders.manage')
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
      // 動態路由：檢查用戶的公司ID與訂單的公司是否匹配
      // 需要查詢company表來確定公司ID對應的公司代碼
      const userCompany = await this.orderService.getUserCompany(userCompanyId);
      
      if (!userCompany || order.company !== userCompany.code) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updateShippingStatus(+id, shippingStatus)
  }

  @RequirePermission('orders.manage')
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
      // 動態路由：檢查用戶的公司ID與訂單的公司是否匹配
      // 需要查詢company表來確定公司ID對應的公司代碼
      const userCompany = await this.orderService.getUserCompany(userCompanyId);
      
      if (!userCompany || order.company !== userCompany.code) {
        throw new Error('無權限修改此訂單');
      }
    }
    
    return this.orderService.updateAdminNotes(+id, adminNotes)
  }
}