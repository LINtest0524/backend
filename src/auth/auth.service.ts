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

  // ✅ 改成比對 company.code（網址中的代碼）
  async validateUser(
    username: string,
    pass: string,
    companyCode?: string, // ✅ 改名為 companyCode 更清楚
  ): Promise<User | null> {
    console.log('🧩 validateUser called:', username, companyCode);
    const user = await this.userService.findOneByUsername(username, ['company']);

    console.log('🔍 查詢帳號:', user);

    if (!user) {
      console.log('❌ 查無此帳號');
      return null;
    }

    if (companyCode) {
      const decodedCode = decodeURIComponent(companyCode);
      if (user.company?.code !== decodedCode) {

        console.log(`Company code mismatch: user = ${user.company?.code}, from URL = ${decodedCode}`);


        return null;
      }
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
    platform: string,
    companyCode?: string, // ✅ 改為 companyCode
  ): Promise<{ user: any; token: string }> {
    console.log('⚙️ login service hit', companyCode);

    const user = await this.validateUser(username, password, companyCode);

    if (!user) {
      throw new UnauthorizedException('帳號、密碼或公司錯誤');
    }

    await this.userService.updateLoginInfo(user.id, clientIp, platform);

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.company?.id ?? null,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        userId: user.id,
        username: user.username,
        role: user.role,
        companyId: user.company?.id ?? null,
        company: user.company ?? null,
      },
    };
  }
}
