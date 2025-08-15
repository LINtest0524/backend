import { Controller, Get, Query } from '@nestjs/common'
import { PopupAnnouncementService } from '../popup-announcement/popup-announcement.service'

@Controller('portal/popup-announcements')
export class PortalPopupAnnouncementController {
  constructor(private readonly popupAnnouncementService: PopupAnnouncementService) {}

  // 前台 - 獲取有效的彈窗公告
  @Get()
  async getActiveAnnouncements(
    @Query('company') companyCode: string
  ) {
    return await this.popupAnnouncementService.findActiveAnnouncements(companyCode)
  }

}