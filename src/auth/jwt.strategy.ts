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


    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Extract from header first
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. Extract from query string for export downloads
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
    // Load complete user data from database including company relations
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
      relations: ['company'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 確保 companyId 屬性直接可用
    return {
      ...user,
      companyId: user.company?.id,
    };
  }
}
