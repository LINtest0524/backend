import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { AdminShippingController } from './admin-shipping.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    AuditLogModule,
  ],
  controllers: [CompanyController, AdminShippingController],
  providers: [CompanyService],
  exports: [TypeOrmModule, CompanyService], // 讓其他 module 可以注入 Company entity 和 service
})
export class CompanyModule {}
