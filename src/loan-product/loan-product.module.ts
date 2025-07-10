import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanProduct } from './loan-product.entity';
import { LoanProductService } from './loan-product.service';
import { LoanProductController } from './loan-product.controller';
import { CompanyModule } from '../company/company.module';
import { UserModule } from '../user/user.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanProduct]),
    CompanyModule,
    UserModule,
    AuditLogModule,
  ],
  providers: [LoanProductService],
  controllers: [LoanProductController],
  exports: [LoanProductService],
})
export class LoanProductModule {}
