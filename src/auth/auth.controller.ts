import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Req() req) {
    console.log('🚀 login controller hit'); // ✅ 新增 log

    const { username, password } = body;
    const clientIp = req.ip;
    const result = await this.authService.login(username, password, clientIp);
    return {
      message: 'Login successful',
      token: result.token,
      user: result.user,
    };
  }
}
