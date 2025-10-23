import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ConflictException,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyModule } from '../company-module/company-module.entity';
import * as UAParser from 'ua-parser-js';
import { CsrfGuard } from '../common/csrf.guard';
import { LoginAttemptService } from '../common/login-attempt.service';
import { SessionService } from '../common/session.service';

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
    private readonly loginAttemptService: LoginAttemptService,
    private readonly sessionService: SessionService,
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,
  ) {}






@Post('register')
@UseGuards(CsrfGuard)
async register(@Body() body: RegisterDto, @Req() req: any) {
  const companyCode = req.query.company;

  if (!companyCode) {
    throw new UnauthorizedException('缺少公司代碼');
  }

  const existing = await this.userService.findOneByUsername(body.username);
  if (existing) {
    throw new ConflictException('註冊失敗，請檢查輸入資料');
  }

  const user = await this.userService.createFromPortal({
    ...body,
    companyCode,
    agent_code: body.agent_code, // 傳遞代理商代碼
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

  // 創建會話記錄
  this.sessionService.createSession(
    fullUser.id,
    fullUser.username,
    fullUser.company?.id ?? 0,
    token,
    platform
  );

  return {
    message: '註冊成功',
    token,
    user: {
      id: fullUser.id,
      username: fullUser.username,
      email: fullUser.email,
      balance: fullUser.balance || 0,
      company: {
        id: fullUser.company.id,
        code: fullUser.company.code,
      },
    },
  };
}


  @Post('login')
  @UseGuards(CsrfGuard)
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: any,
  ) {
    const { username, password } = body;
    const companyCode = req.query.company;

    // 🔹 收集 IP 與平台裝置資訊
    const rawIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';
    
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

    // 1. 檢查是否被封鎖
    const attemptKey = `${clientIp}:${username}`;
    if (this.loginAttemptService.isBlocked(attemptKey)) {
      const remainingTime = this.loginAttemptService.getBlockedTimeRemaining(attemptKey);
      throw new UnauthorizedException(`登入失敗次數過多，請於 ${remainingTime} 分鐘後再試`);
    }

    // 2. 驗證用戶
    const user = await this.userService.validatePortalUser(username, password);
    if (!user) {
      // 記錄失敗嘗試
      this.loginAttemptService.recordFailedAttempt(attemptKey);
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    // 3. 檢查公司代碼
    if (companyCode && user.company?.code !== companyCode) {
      this.loginAttemptService.recordFailedAttempt(attemptKey);
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    // 4. 清除失敗記錄（登入成功）
    this.loginAttemptService.clearAttempts(attemptKey);

    // 5. 生成 JWT Token
    const payload = {
      userId: user.id,
      username: user.username,
      companyId: user.company?.id ?? null,
    };
    const token = this.jwtService.sign(payload);

    // 6. 創建會話（後者踢掉前者）
    this.sessionService.createSession(
      user.id, 
      user.username, 
      user.company?.id ?? 0, 
      token, 
      platform
    );

    // 7. 記錄登入操作
    await this.userService.updateLoginInfo(user.id, clientIp, platform);
    await this.auditLogService.record({
      user,
      action: `登入代理商${user.company?.code ?? ''}官網`,
      ip: clientIp,
      platform,
      target: `login-portal:${user.id}`,
    });

    // 8. 獲取啟用模組
    const enabledModules = await this.moduleRepo.find({
      where: { company: { id: user.company.id }, enabled: true },
    });

    return {
      message: '登入成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance || 0,
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

      // 🔹 檢查會話是否有效（前台用戶需要檢查踢出機制）
      const session = this.sessionService.validateToken(token);
      if (!session) {
        throw new UnauthorizedException('會話已失效，請重新登入');
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
          balance: user.balance || 0,
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

  @Get('profile')
  async getProfile(@Headers('authorization') authHeader: string, @Req() req: any) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token 格式錯誤');
    }

    const token = authHeader.substring(7);
    const companyCode = req.query.company;

    if (!companyCode) {
      throw new UnauthorizedException('缺少公司代碼');
    }

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('用戶不存在');
      }

      if (user.company?.code !== companyCode) {
        throw new UnauthorizedException('公司代碼不匹配');
      }

      if (user.is_blacklisted) {
        throw new UnauthorizedException('此帳號已被列入黑名單');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('帳號已停用');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance || 0,
        vip_level: user.vip_level,
        company: {
          id: user.company.id,
          code: user.company.code,
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

      // 清除會話（會話管理）
      const sessionRemoved = this.sessionService.removeSession(token);
      
      // 記錄登出操作
      await this.auditLogService.record({
        user,
        action: `登出代理商${user.company?.code ?? ''}官網`,
        ip: clientIp,
        platform,
        target: `login-portal:${user.id}`,
      });

      return {
        message: sessionRemoved ? '登出成功' : '登出成功（會話已過期）',
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token 無效或已過期');
      }
      throw error;
    }
  }

  @Post('reset-sessions')
  async resetSessions() {
    // 開發階段用：清除所有會話
    this.sessionService.clearAllSessions();
    return {
      message: '所有會話已清除',
    };
  }
}
