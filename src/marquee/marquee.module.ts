import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marquee } from './marquee.entity';
import { MarqueeService } from './marquee.service';
import { MarqueeController } from './marquee.controller';
import { Company } from '../company/company.entity';
import { CompanyModule as CompanyModuleEntity } from '../company-module/company-module.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Marquee,
      Company,
      CompanyModuleEntity,
    ]),
    forwardRef(() => AuditLogModule), // ✅ 正確寫法：放在 imports 外面
  ],
  providers: [MarqueeService],
  controllers: [MarqueeController],
})
export class MarqueeModule {}
