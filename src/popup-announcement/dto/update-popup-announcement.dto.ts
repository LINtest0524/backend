import { PartialType } from '@nestjs/mapped-types'
import { CreatePopupAnnouncementDto } from './create-popup-announcement.dto'

export class UpdatePopupAnnouncementDto extends PartialType(CreatePopupAnnouncementDto) {}