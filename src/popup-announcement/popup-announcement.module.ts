import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PopupAnnouncementService } from './popup-announcement.service'
import { PopupAnnouncementController } from './popup-announcement.controller'
import { PopupAnnouncement } from './popup-announcement.entity'

@Module({
  imports: [TypeOrmModule.forFeature([PopupAnnouncement])],
  controllers: [PopupAnnouncementController],
  providers: [PopupAnnouncementService],
  exports: [PopupAnnouncementService],
})
export class PopupAnnouncementModule {}