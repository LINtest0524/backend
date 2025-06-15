import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { AuditLogService } from '../audit-log/audit-log.service'; // ✅ 新增 import

@Controller('portal/auth')
export class PortalAuthController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService, // ✅ 注入服務
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto, @Req() req: any) {
    const existing = await this.userService.findOneByUsername(body.username);
    if (existing) {
      throw new ConflictException('帳號已存在');
    }

    const user = await this.userService.createFromPortal(body);
    const fullUser = await this.userService.findById(user.id);

    const payload = {
      userId: fullUser.id,
      username: fullUser.username,
      companyId: fullUser.company?.id ?? null,
    };

    const token = this.jwtService.sign(payload);

    return {
      message: '註冊成功',
      token,
      user: {
        id: fullUser.id,
        username: fullUser.username,
        email: fullUser.email,
      },
    };
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Req() req: any) {
    const { username, password } = body;

    const user = await this.userService.validatePortalUser(username, password);
    if (!user) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const platform = req.headers['user-agent'] || 'unknown';

    // ✅ 寫入稽核紀錄
    await this.auditLogService.logLogin(user, ip, platform);

    const payload = {
      userId: user.id,
      username: user.username,
      companyId: user.company?.id ?? null,
    };

    const token = this.jwtService.sign(payload);

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }
}
