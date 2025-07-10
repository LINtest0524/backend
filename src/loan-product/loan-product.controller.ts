import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { LoanProductService } from './loan-product.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LoanProduct } from './loan-product.entity';
import { UserService } from '../user/user.service';
import * as UAParser from 'ua-parser-js';

@Controller('admin/loan-product')
export class LoanProductController {
  constructor(
    private readonly loanProductService: LoanProductService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async create(@Body() dto: CreateLoanProductDto, @Request() req): Promise<LoanProduct> {
    const fullUser = await this.userService.findById(req.user.userId);
    const { ip, platform } = this.extractClientInfo(req);
    return this.loanProductService.create(dto, fullUser, ip, platform);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findAll(@Request() req, @Query() query: any) {
    const user = req.user;
    if (!user.companyId && user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      throw new UnauthorizedException('無法辨識所屬公司');
    }
    return this.loanProductService.findAll(user, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number, @Request() req) {
    return this.loanProductService.findOneSecured(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async update(@Param('id') id: number, @Body() dto: UpdateLoanProductDto, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.loanProductService.updateSecured(id, dto, user, ip, platform);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async activate(@Param('id') id: number, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.loanProductService.updateSecured(id, { status: 'ACTIVE' }, user, ip, platform);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async deactivate(@Param('id') id: number, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.loanProductService.updateSecured(id, { status: 'INACTIVE' }, user, ip, platform);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN')
  async remove(@Param('id') id: number, @Request() req) {
    const { user } = req;
    if (user.role === 'AGENT_SUPPORT') {
      throw new ForbiddenException('AGENT_SUPPORT 不可刪除貸款產品');
    }
    const { ip, platform } = this.extractClientInfo(req);
    return this.loanProductService.hardDeleteSecured(id, user, ip, platform);
  }

  @Get(':id/clone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async clone(@Param('id') id: number, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.loanProductService.cloneProduct(id, user, ip, platform);
  }

  @Get('company/:companyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findByCompany(@Param('companyId') companyId: number, @Request() req) {
    const user = req.user;

    if (!['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role) && user.companyId !== companyId) {
    throw new ForbiddenException('無權限查看其他公司的貸款產品');
    }

    return this.loanProductService.findByCompany(companyId, user);
  }

  private extractClientInfo(req: any) {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown';
    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();
    const device = info.device.type === 'mobile' ? '手機'
                 : info.device.type === 'tablet' ? '平板'
                 : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;
    return { ip, platform };
  }
}
