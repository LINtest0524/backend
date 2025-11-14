// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import session from 'express-session';
import passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);


  // Configuration請求大小限制
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  // Configuration session 支持 (Facebook OAuth 需要)
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: true, // 改為 true，確保 session 被創建
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        secure: false, // 開發環境使用 HTTP
        httpOnly: false, // 允許客戶端訪問（調試用）
      },
      name: 'facebook-login-session', // 給 session 一個明確的名稱
    }),
  );

  // 初始化 Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configuration Passport 序列化（Facebook OAuth 需要）
  passport.serializeUser((user: any, done) => {
    console.log(' 序列化用戶:', user);
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    console.log(' 反序列化用戶:', user);
    done(null, user);
  });

  //   如果你有上傳圖片想提供靜態存取
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: true, // 允許所有來源，包括 file:// 協議
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  await app.listen(3001);
}
bootstrap();
