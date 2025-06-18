import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { CompanyModule } from '../company-module/company-module.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,
  ) {}

  async validateUser(
    username: string,
    pass: string,
    companyCode?: string,
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
  companyCode?: string,
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

  let enabledModules: CompanyModule[] = []


  // ✅ 如果有綁定公司，才查詢公司啟用模組
  if (user.company?.id) {
    enabledModules = await this.moduleRepo.find({
      where: { company: { id: user.company.id }, enabled: true },
    });
  }

  return {
    token,
    user: {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.company?.id ?? null,
      company: user.company ?? null,
      enabledModules: Object.fromEntries(
        enabledModules.map((m) => [m.module_key, true])
      ),
    },
  };
}

}
