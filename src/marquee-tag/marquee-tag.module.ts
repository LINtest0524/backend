import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarqueeTag } from './marquee-tag.entity';
import { MarqueeTagService } from './marquee-tag.service';
import { MarqueeTagController } from './marquee-tag.controller';
import { Company } from '../company/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MarqueeTag, Company])],
  controllers: [MarqueeTagController],
  providers: [MarqueeTagService],
  exports: [MarqueeTagService],
})
export class MarqueeTagModule {}