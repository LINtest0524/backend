// backend/src/company/company.controller.ts
import { Controller, Get, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller('company')
export class CompanyController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async getAllCompanies() {
    return await this.companyRepository.find({
      select: ['id', 'name', 'code', 'loginMethods'], 
      order: { id: 'ASC' },
    });
  }

  @Get('code/:code/login-methods')
  async getCompanyLoginMethodsByCode(@Param('code') code: string) {
    const company = await this.companyRepository.findOne({
      where: { code },
      select: ['id', 'name', 'code', 'loginMethods'],
    });
    
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

  @Get(':id/login-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async getCompanyLoginMethods(@Param('id') id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      select: ['id', 'name', 'code', 'loginMethods'],
    });
    
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

  @Put(':id/login-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async updateCompanyLoginMethods(
    @Param('id') id: number,
    @Body() body: { loginMethods: string[] },
    @Req() req: any,
  ) {
    const company = await this.companyRepository.findOne({ where: { id } });
    
    if (!company) {
      throw new Error('公司不存在');
    }

    const oldLoginMethods = company.loginMethods || [];
    company.loginMethods = body.loginMethods;
    
    await this.companyRepository.save(company);

    // 記錄操作日誌
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';
    
    await this.auditLogService.record({
      user: req.user,
      action: `更新公司登入方式 - ${company.name}`,
      ip: clientIp,
      platform,
      target: `company-login-methods:${company.id}`,
      before: { loginMethods: oldLoginMethods },
      after: { loginMethods: body.loginMethods },
    });

    return {
      message: '登入方式設定已更新',
      company: {
        id: company.id,
        name: company.name,
        code: company.code,
        loginMethods: company.loginMethods,
      },
    };
  }
}
