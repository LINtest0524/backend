import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './banner.entity';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { AuditLogModule } from '../audit-log/audit-log.module'; // ✅ 加這行

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner]),
    AuditLogModule, // ✅ 加這行
  ],
  controllers: [BannerController],
  providers: [BannerService],
})
export class BannerModule {}
