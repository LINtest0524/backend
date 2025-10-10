import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserTag } from './user-tag.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Module as ModuleEntity } from '../module/module.entity';
import { UserModule as UserModuleEntity } from '../user-module/user-module.entity';
import { Company } from '../company/company.entity'; //   新增
import { CompanyModule } from '../company/company.module'; //   新增
import { MarqueeTag } from '../marquee-tag/marquee-tag.entity';
import { AutoTagRule } from '../auto-tag-rule/auto-tag-rule.entity';
import { AutoTagRuleService } from '../auto-tag-rule/auto-tag-rule.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserTag, ModuleEntity, UserModuleEntity, Company, MarqueeTag, AutoTagRule]), //   補上 AutoTagRule
    CompanyModule, //   import CompanyModule 以支援依賴注入
    AuditLogModule,
    WalletTransactionModule,
  ],
  providers: [UserService, AutoTagRuleService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
