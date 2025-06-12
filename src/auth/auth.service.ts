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

  async validateUser(username: string, pass: string): Promise<User | null> {
    console.log('🧩 validateUser called:', username);
    const user = await this.userService.findOneByUsername(username, ['company']);

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

    return user;
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
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.company?.id ?? null,
    };

    const token = this.jwtService.sign(payload);

    // ✅ 回傳 user 資訊給 controller
    return {
      token,
      user: {
        userId: user.id,
        username: user.username,
        role: user.role,
        companyId: user.company?.id ?? null,
        company: user.company ?? null, // ✅ 傳給 JwtStrategy 用
      },
    };
  }
}
