import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Module as ModuleEntity } from '../module/module.entity';
import { UserModule as UserModuleEntity } from '../user-module/user-module.entity';
import { Company } from '../company/company.entity'; // ✅ 新增
import { CompanyModule } from '../company/company.module'; // ✅ 新增
import { AuditLogModule } from '../audit-log/audit-log.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ModuleEntity, UserModuleEntity, Company]), // ✅ 補上 Company
    CompanyModule, // ✅ 匯入 CompanyModule 以支援依賴注入
    AuditLogModule,
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
