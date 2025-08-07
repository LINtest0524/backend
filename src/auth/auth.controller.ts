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
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as UAParser from 'ua-parser-js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {

    const { username, password, company: companyCode } = body;

    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';





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
      device = '電腦'; // ✅ 改這裡，後台登入也顯示為中文
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

  @Get('test-strategies')
  async testStrategies() {
    const passport = require('passport');
    console.log('🧪 測試可用的 Passport 策略:');
    console.log('Strategies:', Object.keys(passport._strategies || {}));
    return {
      strategies: Object.keys(passport._strategies || {}),
      hasFacebook: !!passport._strategies?.facebook
    };
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth(@Req() req: Request) {
    // 這個路由會重定向到 Facebook
    console.log('🔍 Facebook 認證路由被調用');
    console.log('🔍 公司代碼:', req.query.company);
  }

  @Get('facebook/callback')
  async facebookAuthRedirect(@Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    // 記錄所有查詢參數以便調試
    console.log('🔍 Facebook callback 查詢參數:', req.query);
    
    // 獲取公司代碼，用於錯誤重定向
    const companyCode = req.query.company as string || 'a';
    const loginUrl = `http://localhost:3000/${companyCode}/login`;
    
    // 檢查是否有錯誤參數（用戶取消授權）
    const error = req.query.error;
    const errorReason = req.query.error_reason;
    const errorDescription = req.query.error_description;

    if (error) {
      console.log('❌ Facebook 授權錯誤:', { error, errorReason, errorDescription });
      
      // 用戶取消授權或其他錯誤
      if (error === 'access_denied' || errorReason === 'user_denied') {
        console.log('👤 用戶取消了 Facebook 授權');
        return res.redirect(`${loginUrl}?error=facebook_cancelled`);
      }
      
      // 其他錯誤
      console.log('🔍 其他 Facebook 錯誤，重定向到 facebook_error');
      return res.redirect(`${loginUrl}?error=facebook_error`);
    }

    // 如果沒有錯誤，則使用 Facebook Guard 進行驗證
    console.log('✅ 沒有錯誤參數，繼續 Facebook 登入流程');
    return this.handleFacebookCallback(req, res, ip);
  }

  async handleFacebookCallback(@Req() req: Request, @Res() res: Response, @Ip() ip: string) {
    // 獲取公司代碼，用於錯誤重定向
    const companyCode = req.query.company as string || 'a';
    const loginUrl = `http://localhost:3000/${companyCode}/login`;
    try {
      console.log('🔍 Facebook 回調開始...');
      
      // 手動執行 Facebook Guard 並捕獲錯誤
      const guard = new (AuthGuard('facebook'))();
      
      try {
        console.log('🔍 執行 Facebook Guard...');
        const result = await guard.canActivate({
          switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => res,
          }),
          getHandler: () => {},
          getClass: () => {},
        } as any);
        
        console.log('🔍 Guard 執行結果:', result);
        console.log('🔍 Guard 執行後 req.user:', req.user);
        
      } catch (guardError) {
        console.error('❌ Facebook Guard 執行錯誤:', guardError);
        console.error('❌ 錯誤詳情:', guardError.message);
        console.error('❌ 錯誤堆疊:', guardError.stack);
        return res.redirect(`${loginUrl}?error=facebook_guard_error`);
      }

      // 檢查是否有有效的用戶資料
      if (!req.user) {
        console.log('❌ Facebook Guard 沒有返回用戶資料');
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

      console.log('🔍 開始 Facebook 登入處理...');
      const result = await this.authService.facebookLogin(req.user, ip, platform);
      console.log('✅ Facebook 登入處理成功');
      
      // 將 token 和用戶資訊傳遞給前端
      const redirectUrl = `http://localhost:3000/auth/facebook/success?token=${result.token}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
      
      console.log('🔗 重定向到:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Facebook 回調錯誤:', error);
      console.error('❌ 錯誤堆疊:', error.stack);
      
      // 檢查是否為 UnauthorizedException（帳號狀態問題）
      if (error.name === 'UnauthorizedException') {
        const errorMessage = encodeURIComponent(error.message);
        return res.redirect(`${loginUrl}?error=facebook_unauthorized&message=${errorMessage}`);
      }
      
      // 其他錯誤重定向到通用錯誤頁面
      res.redirect(`${loginUrl}?error=facebook_login_failed`);
    }
  }
}
