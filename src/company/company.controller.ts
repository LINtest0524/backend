// backend/src/company/company.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // 獲取所有公司列表（管理員專用）
  @RequirePermission('companies.view')
  @Get()
  async getAllCompanies() {
    return await this.companyService.findAll();
  }

  // 獲取啟用的公司列表
  @RequirePermission('companies.view')
  @Get('active')
  async getActiveCompanies() {
    return await this.companyService.getActiveCompanies();
  }

  // 新增公司（僅超級管理員）
  @RequirePermission('companies.manage')
  @Post()
  async createCompany(@Body() createCompanyDto: CreateCompanyDto, @Req() req: any) {
    const company = await this.companyService.create(createCompanyDto);

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `新增公司 - ${company.name}`,
      ip: clientIp,
      platform,
      target: `company:${company.id}`,
      before: null,
      after: { 
        name: company.name, 
        code: company.code, 
        status: company.status 
      },
    });

    return {
      message: '公司新增成功',
      company
    };
  }

  // 獲取單個公司詳情 (根據 CODE) - 前台使用
  @RequirePermission('companies.view')
  @Get('code/:code')
  async getCompanyByCode(@Param('code') code: string) {
    const company = await this.companyService.findByCode(code);
    if (!company) {
      throw new Error('公司不存在');
    }
    return company;
  }

  // 獲取單個公司詳情 (根據 ID) - 後台使用
  @RequirePermission('companies.view')
  @Get(':id')
  async getCompanyById(@Param('id') id: number) {
    return await this.companyService.findById(id);
  }

  // 更新公司資料 (根據 CODE) - 推薦使用
  @RequirePermission('companies.manage')
  @Put('code/:code')
  async updateCompanyByCode(
    @Param('code') code: string, 
    @Body() updateCompanyDto: UpdateCompanyDto, 
    @Req() req: any
  ) {
    const oldCompany = await this.companyService.findByCode(code);
    if (!oldCompany) {
      throw new Error('公司不存在');
    }
    
    const updatedCompany = await this.companyService.update(oldCompany.id, updateCompanyDto);

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `更新公司 - ${updatedCompany.name}`,
      ip: clientIp,
      platform,
      target: `company:${updatedCompany.id}`,
      before: { 
        name: oldCompany?.name, 
        code: oldCompany?.code, 
        status: oldCompany?.status 
      },
      after: { 
        name: updatedCompany.name, 
        code: updatedCompany.code, 
        status: updatedCompany.status 
      },
    });

    return {
      message: '公司資料更新成功',
      company: updatedCompany
    };
  }

  // 刪除公司 (根據 CODE) - 推薦使用
  @Delete('code/:code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompanyByCode(@Param('code') code: string, @Req() req: any) {
    const company = await this.companyService.findByCode(code);
    if (!company) {
      throw new Error('公司不存在');
    }
    
    await this.companyService.remove(company.id);

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `刪除公司 - ${company?.name}`,
      ip: clientIp,
      platform,
      target: `company:${company.id}`,
      before: { 
        name: company?.name, 
        code: company?.code, 
        status: company?.status 
      },
      after: null,
    });

    return {
      message: '公司刪除成功'
    };
  }

  // 公開 API：根據公司代碼獲取登入方式
  @Get('code/:code/login-methods')
  async getCompanyLoginMethodsByCode(@Param('code') code: string) {
    const company = await this.companyService.findByCode(code);
    
    if (!company) {
      throw new Error('公司不存在');
    }

    return {
      id: company.id,
      name: company.name,
      code: company.code,
      loginMethods: company.loginMethods || ['USERNAME_PASSWORD', 'FACEBOOK'],
    };
  }

  // 公開 API：獲取公司設定（前台使用）
  @Get('code/:code/config')
  async getCompanyConfig(@Param('code') code: string) {
    const config = await this.companyService.getCompanyConfig(code);
    
    if (!config) {
      throw new Error('公司不存在或已停用');
    }

    return config;
  }

  // 更新公司資料（僅超級管理員）
  @RequirePermission('companies.manage')
  @Put(':id')
  async updateCompany(
    @Param('id') id: number, 
    @Body() updateCompanyDto: UpdateCompanyDto, 
    @Req() req: any
  ) {
    const oldCompany = await this.companyService.findById(id);
    const updatedCompany = await this.companyService.update(id, updateCompanyDto);

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `更新公司 - ${updatedCompany.name}`,
      ip: clientIp,
      platform,
      target: `company:${updatedCompany.id}`,
      before: { 
        name: oldCompany?.name, 
        code: oldCompany?.code, 
        status: oldCompany?.status 
      },
      after: { 
        name: updatedCompany.name, 
        code: updatedCompany.code, 
        status: updatedCompany.status 
      },
    });

    return {
      message: '公司資料更新成功',
      company: updatedCompany
    };
  }

  // 刪除公司（僅超級管理員）
  @RequirePermission('companies.manage')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCompany(@Param('id') id: number, @Req() req: any) {
    const company = await this.companyService.findById(id);
    await this.companyService.remove(id);

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `刪除公司 - ${company?.name}`,
      ip: clientIp,
      platform,
      target: `company:${id}`,
      before: { 
        name: company?.name, 
        code: company?.code, 
        status: company?.status 
      },
      after: null,
    });

    return {
      message: '公司刪除成功'
    };
  }

  // 更新公司狀態
  @RequirePermission('companies.manage')
  @Put(':id/status')
  async updateCompanyStatus(
    @Param('id') id: number, 
    @Body() body: { status: 'active' | 'inactive' }, 
    @Req() req: any
  ) {
    const oldCompany = await this.companyService.findById(id);
    const updatedCompany = await this.companyService.updateStatus(id, body.status);

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `更新公司狀態 - ${updatedCompany.name}`,
      ip: clientIp,
      platform,
      target: `company-status:${updatedCompany.id}`,
      before: { status: oldCompany?.status },
      after: { status: updatedCompany.status },
    });

    return {
      message: `公司狀態已更新為 ${body.status === 'active' ? '啟用' : '停用'}`,
      company: updatedCompany
    };
  }

  // 管理 API：根據 ID 獲取公司登入方式
  @Get(':id/login-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async getCompanyLoginMethods(@Param('id') id: number) {
    const company = await this.companyService.findById(id);
    
    if (!company) {
      throw new Error('公司不存在');
    }

    return {
      id: company.id,
      name: company.name,
      code: company.code,
      loginMethods: company.loginMethods || ['USERNAME_PASSWORD', 'FACEBOOK'],
    };
  }

  // 更新公司登入方式
  @RequirePermission('companies.manage')
  @Put(':id/login-methods')
  async updateCompanyLoginMethods(
    @Param('id') id: number,
    @Body() body: { loginMethods: string[] },
    @Req() req: any,
  ) {
    const company = await this.companyService.findById(id);
    
    if (!company) {
      throw new Error('公司不存在');
    }

    const oldLoginMethods = company.loginMethods || [];
    const updatedCompany = await this.companyService.update(id, { 
      loginMethods: body.loginMethods 
    });

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `更新公司登入方式 - ${updatedCompany.name}`,
      ip: clientIp,
      platform,
      target: `company-login-methods:${updatedCompany.id}`,
      before: { loginMethods: oldLoginMethods },
      after: { loginMethods: body.loginMethods },
    });

    return {
      message: '登入方式設定已更新',
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        code: updatedCompany.code,
        loginMethods: updatedCompany.loginMethods,
      },
    };
  }
}
