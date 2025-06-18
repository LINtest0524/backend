import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Marquee } from './marquee.entity'
import { MarqueeService } from './marquee.service'
import { MarqueeController } from './marquee.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Marquee])],
  providers: [MarqueeService],
  controllers: [MarqueeController],
})
export class MarqueeModule {}
