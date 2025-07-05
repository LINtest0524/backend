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

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const userId = req.user?.userId;
    return this.userService.findById(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER')
  async create(@Body() createUserDto: CreateUserDto, @Request() req): Promise<User> {
    const fullUser = await this.userService.findById(req.user.userId);

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

    if (!user.companyId && user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      throw new UnauthorizedException('無法辨識所屬公司');
    }

    const excludeUserRole = query.excludeUserRole === 'true'; // ✅ 讀 query
    return this.userService.findAll(user, query, { excludeUserRole }); // ✅ 傳給 service
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admin-only')
  getAdminOnlyRoute() {
    return { message: '你是管理員，歡迎進入此路由！' };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number, @Request() req) {
    return this.userService.findOneSecured(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const user = req.user;
    const ip = req.ip;

    // ✅ 平台格式化：裝置 / 作業系統 / 瀏覽器
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

    return this.userService.updateSecured(id, updateUserDto, user, ip, platform);
  }


  @UseGuards(JwtAuthGuard)
  @Patch(':id/password')
  async resetPassword(@Param('id') id: number, @Body() dto: ChangePasswordDto, @Request() req) {
    return this.userService.resetPasswordSecured(id, dto.newPassword, req.user);

  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.userId;
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
}
