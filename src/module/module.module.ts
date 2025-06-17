import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AdminModuleController } from './admin-module.controller'
import { CompanyModule } from '../company-module/company-module.entity'
import { Company } from '../company/company.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyModule, Company]), // ✅ 對應你 controller 中注入的兩個 entity
  ],
  controllers: [AdminModuleController], // ✅ 加上 Controller
})
export class ModuleModule {}
