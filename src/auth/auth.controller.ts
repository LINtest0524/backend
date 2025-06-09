import { Controller, Post, Body, Ip } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
    @Ip() clientIp: string,
  ) {
    return await this.authService.login(username, password, clientIp);
  }
}
