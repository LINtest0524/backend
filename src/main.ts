// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import session from 'express-session';
import passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 配置 session 支持 (Facebook OAuth 需要)
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  // 初始化 Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // 配置 Passport 序列化（Facebook OAuth 需要）
  passport.serializeUser((user: any, done) => {
    console.log('🔄 序列化用戶:', user);
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    console.log('🔄 反序列化用戶:', user);
    done(null, user);
  });

  // ✅ 如果你有上傳圖片想提供靜態存取
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(3001);
}
bootstrap();
