import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactInfoService } from './contact-info.service';
import { ContactInfoController } from './contact-info.controller';
import { ContactInfo } from './contact-info.entity';
import { Company } from '../company/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactInfo, Company])],
  controllers: [ContactInfoController],
  providers: [ContactInfoService],
  exports: [ContactInfoService],
})
export class ContactInfoModule {}