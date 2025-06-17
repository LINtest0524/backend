import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CompanyModule } from './company-module.entity'
import { Company } from '../company/company.entity'
import { CompanyModuleController } from './company-module.controller'
import { CompanyModuleService } from './company-module.service'

@Module({
  imports: [TypeOrmModule.forFeature([CompanyModule, Company])],
  controllers: [CompanyModuleController],
  providers: [CompanyModuleService],
})
export class CompanyModuleModule {}
