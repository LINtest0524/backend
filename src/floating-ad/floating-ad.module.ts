import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FloatingAd } from './floating-ad.entity';
import { FloatingAdService } from './floating-ad.service';
import { FloatingAdController } from './floating-ad.controller';
import { Company } from '../company/company.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FloatingAd,
      Company,
    ]),
    forwardRef(() => AuditLogModule),
  ],
  providers: [FloatingAdService],
  controllers: [FloatingAdController],
  exports: [FloatingAdService],
})
export class FloatingAdModule {}