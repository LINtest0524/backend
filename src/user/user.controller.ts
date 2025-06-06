import { Controller, Post, Body, Get, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return {
      id: user.id,
      username: user.username,
      created_at: user.created_at,
    };
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const { user, token } = await this.userService.login(body.username, body.password);
    return {
      message: 'Login success',
      id: user.id,
      username: user.username,
      token,
    };
  }

  // 取得自己 Profile
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // 取得所有會員 (管理員功能)
  @Get('list')
  async getAllUsers() {
    const users = await this.userService.findAll();
    return users;
  }
}
