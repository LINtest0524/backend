import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Req() req: any) {
    console.log('✅ login controller route hit'); // 👈 測試是否有進入

    const { username, password } = body;
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    console.log('🧾 請求來自 IP:', clientIp);

    const result = await this.authService.login(username, password, clientIp);
    return {
      message: 'Login successful',
      token: result.token,
      user: result.user,
    };
  }
}
