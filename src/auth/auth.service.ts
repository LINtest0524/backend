import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    console.log('🧩 validateUser called:', username);
    const user = await this.userService.findOneByUsername(username);
    console.log('🔍 查詢帳號:', user);

    if (!user) {
      console.log('❌ 查無此帳號');
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    console.log('🔑 密碼比對結果:', isMatch);

    if (!isMatch) {
      console.log('❌ 密碼錯誤');
      return null;
    }

    if (user.is_blacklisted) {
      throw new UnauthorizedException('此帳號已被列入黑名單，無法登入');
    }

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async login(
    username: string,
    password: string,
    clientIp: string,
  ): Promise<{ user: any; token: string }> {
    console.log('⚙️ login service hit');
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      username: user.username,
      sub: user.userId,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    return { user, token };
  }
}
