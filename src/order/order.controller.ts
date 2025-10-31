import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request, Inject } from '@nestjs/common'
import { OrderService } from './order.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Company } from '../company/company.entity'

@Controller('admin/orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>
  ) {}

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
    console.log('=== 訂單查詢開始 ===');
    console.log('請求用戶資訊:', {
      username: req.user?.username,
      role: req.user?.role,
      companyId: req.user?.companyId,
      company_id: req.user?.company_id,
      userId: req.user?.id
    });
    console.log('請求參數:', {
      company,
      page,
      limit,
      status,
      search,
      paymentMethod,
      startDate,
      endDate,
      productName
    });

    // 權限檢查：代理商只能查看自己公司的訂單
    const userCompanyId = req.user.companyId || req.user.company_id;
    const originalCompany = company;
    
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
          console.log(`用戶 company_id: ${userCompanyId} -> 動態公司代碼: ${company}`);
        } else {
          console.log(`警告：找不到 company_id ${userCompanyId} 對應的公司，使用預設值`);
          company = 'default';
        }
      } else {
        console.log(`警告：用戶沒有 company_id，無法查詢訂單`);
        return { data: [], total: 0 }; // 沒有公司ID就不能查詢訂單
      }
    } else {
      console.log(`管理員用戶，使用原始公司參數: ${company}`);
    }
    
    console.log(`最終查詢公司: ${originalCompany} -> ${company}`);
    
    const result = await this.orderService.findAll(company, page, limit, {
      status,
      search,
      paymentMethod,
      startDate,
      endDate,
      productName
    });
    
    console.log(`查詢結果: 找到 ${result.total} 筆訂單，返回 ${result.data.length} 筆`);
    console.log('=== 訂單查詢結束 ===');
    
    return result;
  }

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