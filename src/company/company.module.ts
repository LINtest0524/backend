import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { CompanyController } from './company.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    AuditLogModule,
  ],
  controllers: [CompanyController],
  exports: [TypeOrmModule], // 讓其他 module 可以注入 Company entity
})
export class CompanyModule {}
