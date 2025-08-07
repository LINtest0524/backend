import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

console.log('📦 Facebook Strategy 文件被加載');

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    console.log('🏗️ FacebookStrategy constructor 開始');
    
    try {
      const clientID = configService.get('FACEBOOK_APP_ID') || '';
      const clientSecret = configService.get('FACEBOOK_APP_SECRET') || '';
      
      console.log('🔧 Facebook Strategy 配置:');
      console.log('  - Client ID:', clientID ? `${clientID.substring(0, 8)}...` : '未設定');
      console.log('  - Client Secret:', clientSecret ? `${clientSecret.substring(0, 8)}...` : '未設定');
      console.log('  - Callback URL: http://localhost:3001/auth/facebook/callback');
      
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
      
      console.log('✅ FacebookStrategy 初始化成功');
    } catch (error) {
      console.error('❌ FacebookStrategy 初始化失敗:', error);
      throw error;
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    console.log('🎯 Facebook Strategy validate 方法被調用');
    console.log('🔍 Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : '無');
    console.log('🔍 Facebook Profile:', profile);
    
    const { id, name, photos } = profile;
    
    const user = {
      facebookId: id,
      firstName: name?.givenName,
      lastName: name?.familyName,
      picture: photos?.[0]?.value,
      accessToken,
    };

    console.log('🔍 處理後的用戶資料:', user);
    return user;
  }
}