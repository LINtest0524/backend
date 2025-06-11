import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  exports: [TypeOrmModule], // 讓其他 module 可以注入 Company entity
})
export class CompanyModule {}
