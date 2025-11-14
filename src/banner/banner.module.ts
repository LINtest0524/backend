import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './banner.entity';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { AuditLogModule } from '../audit-log/audit-log.module'; //   加這行
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner]),
    AuditLogModule, //   加這行
    forwardRef(() => AuthModule),
  ],
  controllers: [BannerController],
  providers: [BannerService],
})
export class BannerModule {}
