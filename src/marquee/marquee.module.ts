import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Marquee } from './marquee.entity'
import { MarqueeService } from './marquee.service'
import { MarqueeController } from './marquee.controller'
import { Company } from '../company/company.entity' // ✅ 加入 Company entity
import { CompanyModule as CompanyModuleEntity } from '../company-module/company-module.entity' // ✅ 加入 CompanyModule entity

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Marquee,
      Company,               // ✅ 注入 CompanyRepository
      CompanyModuleEntity,   // ✅ 注入 CompanyModuleRepository
    ]),
  ],
  providers: [MarqueeService],
  controllers: [MarqueeController],
})
export class MarqueeModule {}
