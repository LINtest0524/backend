import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userService.findOneByUsername(username);

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return null;
    }

    // ✅ 黑名單檢查加在這裡
    if (user.is_blacklisted) {
      throw new UnauthorizedException('此帳號已被列入黑名單，無法登入');
    }

    // 回傳資訊供 JWT 登入使用
    return {
      userId: user.id,
      username: user.username,
    };
  }


  async login(username: string, password: string, clientIp: string): Promise<{ user: User; token: string }> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 可選：更新登入資訊
    // user.last_login_at = new Date();
    // user.last_login_ip = clientIp;
    // await this.userService.save(user);

    const payload = { username: user.username, sub: user.id };
    const token = this.jwtService.sign(payload);

    return { user, token };
  }
}
