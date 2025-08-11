import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ConflictException,
  Get,
  Headers,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyModule } from '../company-module/company-module.entity';
import * as UAParser from 'ua-parser-js';

// 統一 IP 格式的輔助函數
function normalizeIP(ip: string): string {
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1'; // 統一顯示為 IPv4 localhost
  }
  // 處理其他 IPv6 mapped IPv4 地址
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7); // 移除 ::ffff: 前綴
  }
  return ip;
}

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
    throw new ConflictException('帳號already exists');
  }

  const user = await this.userService.createFromPortal({
    ...body,
    companyCode,
  });

  const fullUser = await this.userService.findById(user.id);

  // 🔹 收集 IP 與平台裝置資訊
  const rawIp =
    (req.headers['x-forwarded-for'] as string) ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
  
  // 統一 IP 格式：將 IPv6 localhost 轉換為 IPv4
  const clientIp = normalizeIP(rawIp);

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
    device = '電腦';
  }

  const os = `${info.os.name} ${info.os.version}`;
  const browser = `${info.browser.name} ${info.browser.version}`;
  const platform = `${device} / ${os} / ${browser}`;

  // 🔹 記錄登入資訊與操作紀錄
  await this.userService.updateLoginInfo(fullUser.id, clientIp, platform);
  
  // 記錄註冊操作
  await this.auditLogService.record({
    user: fullUser,
    action: `註冊代理商${fullUser.company?.code ?? ''}官網`,
    ip: clientIp,
    platform,
    target: `register-portal:${fullUser.id}`,
  });
  
  // 記錄登入操作（讓前台登入紀錄可以顯示）
  await this.auditLogService.record({
    user: fullUser,
    action: `註冊後自動登入代理商${fullUser.company?.code ?? ''}官網`,
    ip: clientIp,
    platform,
    target: `login-portal:${fullUser.id}`,
  });

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
      console.warn(` 公司代碼錯誤：帳號 ${user.username} 嘗試從 ${companyCode} 登入`);
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    const rawIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';
    
    // 統一 IP 格式：將 IPv6 localhost 轉換為 IPv4
    const clientIp = normalizeIP(rawIp);

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
      device = '電腦'; //   改這行，把 unknown 譯為「電腦」
    }

    const os = `${info.os.name} ${info.os.version}`;
    const browser = `${info.browser.name} ${info.browser.version}`;
    const platform = `${device} / ${os} / ${browser}`;

    //   寫入操作紀錄：登入代理商官網
    await this.userService.updateLoginInfo(user.id, clientIp, platform);
    await this.auditLogService.record({
      user,
      action: `登入代理商${user.company?.code ?? ''}官網`,
      ip: clientIp,
      platform,
      target: `login-portal:${user.id}`, //   必須補上，讓前台能篩選登入紀錄
    });



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

  @Post('verify-token')
  async verifyToken(@Headers('authorization') authHeader: string, @Req() req: any) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token 格式錯誤');
    }

    const token = authHeader.substring(7);
    const companyCode = req.query.company;

    if (!companyCode) {
      throw new UnauthorizedException('缺少公司代碼');
    }

    try {
      // 驗證 token
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('用戶不存在');
      }

      // 檢查用戶是否屬於指定公司
      if (user.company?.code !== companyCode) {
        throw new UnauthorizedException('公司代碼不匹配');
      }

      // 檢查用戶狀態
      if (user.is_blacklisted) {
        throw new UnauthorizedException('此帳號已被列入黑名單，無法登入');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('帳號已inactive或封鎖，無法登入');
      }

      // 🔹 收集 IP 與平台裝置資訊
      const rawIp =
        (req.headers['x-forwarded-for'] as string) ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
      
      // 統一 IP 格式：將 IPv6 localhost 轉換為 IPv4
      const clientIp = normalizeIP(rawIp);

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
        device = '電腦';
      }

      const os = `${info.os.name} ${info.os.version}`;
      const browser = `${info.browser.name} ${info.browser.version}`;
      const platform = `${device} / ${os} / ${browser}`;

      // 記錄 token 驗證登入
      await this.auditLogService.record({
        user,
        action: `Token驗證登入代理商${user.company?.code ?? ''}官網`,
        ip: clientIp,
        platform,
        target: `login-portal:${user.id}`,
      });

      // 獲取啟用的模組
      const enabledModules = await this.moduleRepo.find({
        where: { company: { id: user.company.id }, enabled: true },
      });

      return {
        message: 'Token 驗證成功',
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
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token 無效或已過期');
      }
      throw error;
    }
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader: string, @Req() req: any) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token 格式錯誤');
    }

    const token = authHeader.substring(7);
    const companyCode = req.query.company;

    if (!companyCode) {
      throw new UnauthorizedException('缺少公司代碼');
    }

    try {
      // 驗證 token 並獲取用戶資訊
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('用戶不存在');
      }

      // 檢查用戶是否屬於指定公司
      if (user.company?.code !== companyCode) {
        throw new UnauthorizedException('公司代碼不匹配');
      }

      // 🔹 收集 IP 與平台裝置資訊
      const rawIp =
        (req.headers['x-forwarded-for'] as string) ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
      
      // 統一 IP 格式：將 IPv6 localhost 轉換為 IPv4
      const clientIp = normalizeIP(rawIp);

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
        device = '電腦';
      }

      const os = `${info.os.name} ${info.os.version}`;
      const browser = `${info.browser.name} ${info.browser.version}`;
      const platform = `${device} / ${os} / ${browser}`;

      // 記錄登出操作
      await this.auditLogService.record({
        user,
        action: `登出代理商${user.company?.code ?? ''}官網`,
        ip: clientIp,
        platform,
        target: `login-portal:${user.id}`,
      });

      return {
        message: '登出成功',
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token 無效或已過期');
      }
      throw error;
    }
  }
}
