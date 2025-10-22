import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as UAParser from 'ua-parser-js';
import { SessionService } from '../common/session.service';
import { JwtService } from '@nestjs/jwt';

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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

  // 將 normalizeIP 設為類方法，方便調用
  private normalizeIP(ip: string): string {
    return normalizeIP(ip);
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {

    const { username, password, company: companyCode } = body;

    const rawIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';
    
    // 統一 IP 格式：將 IPv6 localhost 轉換為 IPv4
    const clientIp = this.normalizeIP(rawIp);





    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(userAgent);
    const info = parser.getResult();

    let deviceType = info.device.type ?? 'desktop'; // fallback 為 desktop
    let device: string;

    if (deviceType === 'mobile') {
      device = '手機';
    } else if (deviceType === 'tablet') {
      device = '平板';
    } else {
      device = '電腦'; //   改這裡，後台登入也顯示為中文
    }

    const os = `${info.os.name} ${info.os.version}`;
    const browser = `${info.browser.name} ${info.browser.version}`;
    const platform = `${device} / ${os} / ${browser}`;


    const result = await this.authService.login(
      username,
      password,
      clientIp,
      platform,
      companyCode,
    );

    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: Request) {
    return {
      user: req.user,
      message: '當前用戶資訊'
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    // 從 Authorization header 獲取 token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // 清除會話
      const sessionRemoved = this.sessionService.removeSession(token);
      
      return {
        message: sessionRemoved ? '登出成功' : '登出成功（會話已過期）',
      };
    }
    
    return {
      message: '登出成功',
    };
  }

  @Get('test-strategies')
  async testStrategies() {
    const passport = require('passport');
    return {
      strategies: Object.keys(passport._strategies || {}),
      hasFacebook: !!passport._strategies?.facebook
    };
  }

  @Get('facebook')
  async facebookAuth(@Req() req: Request, @Res() res: Response) {
    // 這個路由會重定向到 Facebook
    const companyCode = req.query.company as string || 'a';
    
    // 將公司代碼保存到 session
    if (req.query.company) {
      req.session = req.session || {};
      req.session.companyCode = req.query.company as string;
    }
    
    // 使用 state 參數傳遞公司代碼，這樣更可靠
    const passport = require('passport');
    const authenticateOptions = {
      scope: ['public_profile'],
      state: companyCode // 將公司代碼作為 state 參數傳遞
    };
    
    passport.authenticate('facebook', authenticateOptions)(req, res);
  }

  @Get('facebook/get-login-data')
  async getFacebookLoginData(@Req() req: Request) {
    // 從session獲取Facebook登入資料
    const loginData = req.session?.facebookLoginData;
    
    if (loginData) {
      // 清除session中的資料（一次性使用）
      delete req.session.facebookLoginData;
      return {
        success: true,
        data: loginData
      };
    }
    
    return {
      success: false,
      message: '找不到Facebook登入資料'
    };
  }

  @Get('facebook/callback')
  async facebookAuthRedirect(@Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    // 獲取公司代碼，優先從 state 參數取得，其次從 session，最後從 query
    const companyCode = req.query.state as string || req.session?.companyCode || req.query.company as string || 'a';
    const loginUrl = `http://localhost:3000/${companyCode}/login`;
    
    // 檢查是否有錯誤參數（用戶取消授權）
    const error = req.query.error;
    const errorReason = req.query.error_reason;
    const errorDescription = req.query.error_description;

    if (error) {
      // User取消授權或其他錯誤
      if (error === 'access_denied' || errorReason === 'user_denied') {
        return res.redirect(`${loginUrl}?error=facebook_cancelled`);
      }
      
      // 其他錯誤
      return res.redirect(`${loginUrl}?error=facebook_error`);
    }
    return this.handleFacebookCallback(req, res, ip);
  }

  async handleFacebookCallback(@Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    // 獲取公司代碼，優先從 state 參數取得，其次從 session，最後從 query
    const companyCode = req.query.state as string || req.session?.companyCode || req.query.company as string || 'a';
    const loginUrl = `http://localhost:3000/${companyCode}/login`;
    try {
      // 手動執行 Facebook Guard 並捕獲錯誤
      const guard = new (AuthGuard('facebook'))();
      
      try {
        const result = await guard.canActivate({
          switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => res,
          }),
          getHandler: () => {},
          getClass: () => {},
        } as any);
        
      } catch (guardError) {
        console.error('    Facebook Guard 執行錯誤:', guardError);
        console.error('    錯誤詳情:', guardError.message);
        console.error('    錯誤堆疊:', guardError.stack);
        return res.redirect(`${loginUrl}?error=facebook_guard_error`);
      }

      // 檢查是否有有效的用戶資料
      if (!req.user) {
        console.log('    Facebook Guard 沒有返回用戶資料');
        return res.redirect(`${loginUrl}?error=facebook_login_failed`);
      }

      // 平台格式化
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

      // 統一 IP 格式
      const normalizedIp = this.normalizeIP(ip);
      const result = await this.authService.facebookLogin(req.user, normalizedIp, platform, companyCode);
      
      // 將敏感資料儲存到session而不是URL參數
      req.session = req.session || {};
      req.session.facebookLoginData = {
        token: result.token,
        user: result.user,
        company: companyCode
      };
      
      // 只傳遞安全的重定向URL，不包含敏感資料
      const redirectUrl = `http://localhost:3000/auth/facebook/success?company=${companyCode}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('    Facebook 回調錯誤:', error);
      console.error('    錯誤堆疊:', error.stack);
      
      // 檢查是否為 UnauthorizedException（帳號status問題）
      if (error.name === 'UnauthorizedException') {
        const errorMessage = encodeURIComponent(error.message);
        return res.redirect(`${loginUrl}?error=facebook_unauthorized&message=${errorMessage}`);
      }
      
      // 其他錯誤重定向到通用錯誤頁面
      res.redirect(`${loginUrl}?error=facebook_login_failed`);
    }
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  async validateToken(@Req() req) {
    // 如果能通過 JwtAuthGuard，表示 token 有效
    // 返回用戶基本信息
    const { id, username, email, role, company } = req.user;
    
    return {
      valid: true,
      user: {
        id,
        username,
        email,
        role,
        companyId: company?.id
      }
    };
  }
}
