import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    try {
      const clientID = configService.get('FACEBOOK_APP_ID') || '';
      const clientSecret = configService.get('FACEBOOK_APP_SECRET') || '';
      
      if (!clientID || !clientSecret) {
        throw new Error('Facebook App ID 或 App Secret 未設定');
      }
      
      super({
        clientID,
        clientSecret,
        callbackURL: 'http://localhost:3001/auth/facebook/callback',
        scope: ['public_profile'], // 暫時移除 email，只使用基本權限
        profileFields: ['id', 'name', 'picture'],
      });
      
    } catch (error) {
      console.error('FacebookStrategy 初始化失敗:', error);
      throw error;
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    
    const { id, name, photos } = profile;
    
    const user = {
      facebookId: id,
      firstName: name?.givenName,
      lastName: name?.familyName,
      picture: photos?.[0]?.value,
      accessToken,
    };

    return user;
  }
}