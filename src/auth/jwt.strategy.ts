import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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
    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      companyId: payload.companyId,
    };
  }
}
