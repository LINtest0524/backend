import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
console.log('✅ NestJS is starting...');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ 加這段：允許來自前端的跨網域請求
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(3001);
}

bootstrap();
