import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'fallback_secret';

    console.log('✅ JWT_SECRET used for verify:', jwtSecret);

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1️⃣ 先從 header 拿
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2️⃣ 再從 query string 抓 token（給匯出下載用）
        (req: Request) => {
          const token = req?.query?.token;
          if (typeof token === 'string') return token;
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // 從資料庫載入完整的用戶資料，包含公司關聯
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
      relations: ['company'],
    });

    if (!user) {
      throw new Error('用戶不存在');
    }

    console.log('JWT 驗證 - 載入用戶:', {
      id: user.id,
      username: user.username,
      role: user.role,
      company: user.company,
      companyId: user.company?.id,
    });

    // 確保 companyId 屬性直接可用
    return {
      ...user,
      companyId: user.company?.id,
    };
  }
}
