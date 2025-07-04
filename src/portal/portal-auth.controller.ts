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
import { AuditLogService } from '../audit-log/audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyModule } from '../company-module/company-module.entity';
import * as UAParser from 'ua-parser-js';

@Controller('portal/auth')
export class PortalAuthController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto, @Req() req: any) {
    const companyCode = req.query.company;

    if (!companyCode) {
      throw new UnauthorizedException('缺少公司代碼');
    }

    const existing = await this.userService.findOneByUsername(body.username);
    if (existing) {
      throw new ConflictException('帳號已存在');
    }

    const user = await this.userService.createFromPortal({
      ...body,
      companyCode,
    });

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
        company: {
          id: fullUser.company.id,
          code: fullUser.company.code,
        },
      },
    };
  }

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: any,
  ) {
    const { username, password } = body;

    const user = await this.userService.validatePortalUser(username, password);
    if (!user) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    const companyCode = req.query.company;
    if (companyCode && user.company?.code !== companyCode) {
      console.warn(`🚫 公司代碼錯誤：帳號 ${user.username} 嘗試從 ${companyCode} 登入`);
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(userAgent);
    const info = parser.getResult();

    let deviceType = info.device.type ?? 'desktop';
    let device: string;

    if (deviceType === 'mobile') {
      device = '手機';
    } else if (deviceType === 'tablet') {
      device = '平板';
    } else {
      device = '電腦'; // ✅ 改這行，把 unknown 譯為「電腦」
    }

    const os = `${info.os.name} ${info.os.version}`;
    const browser = `${info.browser.name} ${info.browser.version}`;
    const platform = `${device} / ${os} / ${browser}`;

    // ✅ 寫入操作紀錄：登入代理商官網
    await this.userService.updateLoginInfo(user.id, clientIp, platform);
    await this.auditLogService.logLogin(user, clientIp, platform, `登入代理商${user.company?.code ?? ''}官網`);


    const token = this.jwtService.sign({
      userId: user.id,
      username: user.username,
      companyId: user.company?.id ?? null,
    });

    const enabledModules = await this.moduleRepo.find({
      where: { company: { id: user.company.id }, enabled: true },
    });

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        company: {
          id: user.company.id,
          code: user.company.code,
        },
        enabledModules: enabledModules.map((m) => m.module_key),
      },
    };
  }
}
