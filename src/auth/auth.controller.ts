import { Controller, Post, Body, Req, Res } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { LoginResponseDto } from './dto/login-response.dto'
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response } from 'express'; // ✅ 引入 Response 型別

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
async login(
  @Body() body: LoginDto,
  @Req() req: any,
  @Res({ passthrough: true }) res: Response, // ✅ 加這行
): Promise<LoginResponseDto> {
  console.log('✅ login controller route hit');

  const { username, password, company } = body;

  const clientIp =
    req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
  const platform = req.headers['user-agent'] || 'unknown';

  console.log('🧾 請求來自 IP:', clientIp);
  console.log('💻 裝置平台:', platform);
  console.log('🏢 公司名稱:', company);

  const result = await this.authService.login(username, password, clientIp, platform, company);

  // ✅ 寫入 cookie
  res.cookie('token', result.token, {
    httpOnly: true,
    sameSite: 'lax', // 可改為 'none' 並設定 secure: true（若有 HTTPS）
    maxAge: 1000 * 60 * 60 * 24, // 1 天
  });

  return result;
}
}
