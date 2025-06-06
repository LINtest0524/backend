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
  async login(@Body() body: { username: string; password: string }, @Request() req) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const { user, token } = await this.userService.login(body.username, body.password, clientIp as string);

    return {
      message: 'Login success',
      id: user.id,
      username: user.username,
      token: token,
    };
  }

  @Get('list')
  async getAllUsers() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
