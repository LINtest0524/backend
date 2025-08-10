import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogoService } from './logo.service';
import { LogoController } from './logo.controller';
import { Logo } from './logo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Logo])],
  controllers: [LogoController],
  providers: [LogoService],
  exports: [LogoService],
})
export class LogoModule {}