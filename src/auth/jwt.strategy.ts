import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { SessionService } from '../common/session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sessionService: SessionService,
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
      passReqToCallback: true, // 讓 validate 方法可以接收 request 物件
    });
  }

  async validate(req: Request, payload: any) {
    // 1. 從 request 中提取 token
    let token: string | null = null;
    
    // 從 Authorization header 提取
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // 從 query string 提取（用於文件下載等）
    if (!token && typeof req.query?.token === 'string') {
      token = req.query.token;
    }
    
    if (!token) {
      throw new Error('Token not found');
    }

    // 2. 檢查會話是否有效（實現踢出機制）
    // 判斷是否為後台管理員（根據角色判斷）
    const isBackendAdmin = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'].includes(payload.role);
    
    if (!isBackendAdmin) {
      // 前台用戶需要檢查會話
      const session = this.sessionService.validateToken(token);
      if (!session) {
        // 使用更簡潔的錯誤處理，避免刷屏
        throw new UnauthorizedException('Session expired or invalid');
      }
    }
    // 後台管理員不需要會話驗證，直接通過
    
    // 3. 確保 payload 中的用戶ID 與會話中的用戶ID 一致（僅前台用戶）
    if (!isBackendAdmin) {
      const session = this.sessionService.validateToken(token);
      if (session && session.userId !== payload.userId) {
        console.log(`用戶ID不匹配 - Payload: ${payload.userId}, Session: ${session.userId}`);
        throw new Error('Session user mismatch');
      }
    }

    // 3. Load complete user data from database including company relations
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
