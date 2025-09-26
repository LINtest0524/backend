// backend/src/user/user.controller.ts（修正後）
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
import { UserService } from './user.service';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from './user.entity';
import * as UAParser from 'ua-parser-js';

import { ExportUserDto } from './dto/export-user.dto';
import { Response } from 'express';
import { Res } from '@nestjs/common';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const userId = req.user?.id || req.user?.userId; // 兼容新舊格式
    return this.userService.findById(userId);
  }





  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Get('export')
  async exportUsers(
    @Request() req,
    @Query() query: ExportUserDto,
    @Res() res: Response,
  ) {
    const user = req.user;

    // 代理商角色必須驗證公司
    const companyId = user.company?.id || user.companyId;
    console.log('用戶公司檢查:', { userId: user.id, role: user.role, company: user.company, companyId });
    
    if (!companyId && user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      throw new UnauthorizedException('not found使用者的公司資訊');
    }

    return this.userService.exportUsers(user, query, res);
  }






  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admin-only')
  getAdminOnlyRoute() {
    return { message: '你是管理員，歡迎進入此路由！' };
  }
















  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER')
  async create(@Body() createUserDto: CreateUserDto, @Request() req): Promise<User> {
    const userId = req.user.id || req.user.userId;
    const fullUser = await this.userService.findById(userId);

    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();

    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.userService.create(createUserDto, fullUser, ip, platform);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Get()
  async findAll(@Request() req, @Query() query: any) {
    const user = req.user;

    const companyId = user.company?.id || user.companyId;
    console.log('用戶公司檢查 (findAll):', { userId: user.id, role: user.role, company: user.company, companyId });
    
    if (!companyId && user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      throw new UnauthorizedException('not found使用者的公司資訊');
    }

    const excludeUserRole = query.excludeUserRole === 'true'; //   讀 query
    return this.userService.findAll(user, query, { excludeUserRole }); //   傳給 service
  }


  

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number, @Request() req) {
    return this.userService.findOneSecured(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // 將字串 ID 轉換為數字，並處理無效值
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || id === 'undefined' || id === 'null') {
      throw new UnauthorizedException('無效的使用者 ID');
    }

    const user = req.user;
    const ip = req.ip;

    //   平台格式化：裝置 / 作業系統 / 瀏覽器
    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();
    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.userService.updateSecured(numericId, updateUserDto, user, ip, platform);
  }


  @UseGuards(JwtAuthGuard)
  @Patch(':id/password')
  async resetPassword(@Param('id') id: number, @Body() dto: ChangePasswordDto, @Request() req) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();

    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.userService.resetPasswordSecured(id, dto.newPassword, req.user, ip, platform);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.id || req.user.userId;
    return this.userService.changePassword(userId, dto);
  }


  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req) {
    const user = req.user;
    if (user.role === 'AGENT_SUPPORT') {
      throw new ForbiddenException('AGENT_SUPPORT 不可刪除使用者');
    }

    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();

    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.userService.softDeleteSecured(id, user, ip, platform);


  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/unblacklist')
  async removeFromBlacklist(@Param('id') id: number, @Request() req) {
    return this.userService.updateSecured(id, { is_blacklisted: false }, req.user);
  }

  // 標籤管理 API
  @UseGuards(JwtAuthGuard)
  @Get(':id/tags')
  async getUserTags(@Param('id') id: number, @Request() req) {
    return this.userService.getUserTags(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/tags/:tagId')
  async addUserTag(@Param('id') id: number, @Param('tagId') tagId: number, @Request() req) {
    return this.userService.addUserTag(id, tagId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/tags/:tagId')
  async removeUserTag(@Param('id') id: number, @Param('tagId') tagId: number, @Request() req) {
    return this.userService.removeUserTag(id, tagId, req.user);
  }

  // 身分證驗證 API
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Patch(':id/id-verification')
  async updateIdVerification(@Param('id') id: number, @Body('verified') verified: boolean, @Request() req) {
    return this.userService.updateIdVerification(id, verified, req.user);
  }

  // 銀行驗證 API
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Patch(':id/bank-verification')
  async updateBankVerification(@Param('id') id: number, @Body('verified') verified: boolean, @Request() req) {
    return this.userService.updateBankVerification(id, verified, req.user);
  }

  // VIP等級 API
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Patch(':id/vip-level')
  async updateVipLevel(@Param('id') id: number, @Body('level') level: number, @Request() req) {
    return this.userService.updateVipLevel(id, level, req.user);
  }

  // 批量應用自動化標籤
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER')
  @Post('apply-auto-tags')
  async applyAutoTagsToAllUsers(@Request() req) {
    const companyId = req.user.role === 'SUPER_ADMIN' ? undefined : req.user.company_id;
    return this.userService.applyAutoTagsToAllUsers(companyId);
  }

  // 為特定使用者應用自動化標籤
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Post(':id/apply-auto-tags')
  async applyAutoTagsToUser(@Param('id') id: number, @Request() req) {
    return this.userService.applyAutoTagsToUser(id, req.user);
  }

  // 檢查自動標籤狀態
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Get(':id/auto-tag-status')
  async checkAutoTagStatus(@Param('id') id: number, @Request() req) {
    return this.userService.checkAutoTagStatus(id, req.user);
  }

}
