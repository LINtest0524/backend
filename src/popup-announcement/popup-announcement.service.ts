import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThanOrEqual, LessThanOrEqual, IsNull } from 'typeorm'
import { PopupAnnouncement } from './popup-announcement.entity'
import { CreatePopupAnnouncementDto } from './dto/create-popup-announcement.dto'
import { UpdatePopupAnnouncementDto } from './dto/update-popup-announcement.dto'

@Injectable()
export class PopupAnnouncementService {
  constructor(
    @InjectRepository(PopupAnnouncement)
    private popupAnnouncementRepository: Repository<PopupAnnouncement>,
  ) {}

  // 創建彈窗公告
  async create(createDto: CreatePopupAnnouncementDto): Promise<PopupAnnouncement> {
    const announcement = this.popupAnnouncementRepository.create(createDto)
    return await this.popupAnnouncementRepository.save(announcement)
  }

  // 獲取所有彈窗公告（後台管理用）
  async findAll(companyCode: string): Promise<PopupAnnouncement[]> {
    return await this.popupAnnouncementRepository.find({
      where: { company_code: companyCode },
      order: { sort_order: 'DESC', created_at: 'DESC' }
    })
  }

  // 獲取有效的彈窗公告（前台顯示用）
  async findActiveAnnouncements(companyCode: string): Promise<PopupAnnouncement[]> {
    const now = new Date()

    // 獲取所有有效的公告
    return await this.popupAnnouncementRepository.find({
      where: [
        {
          company_code: companyCode,
          status: 'active',
          start_date: LessThanOrEqual(now),
          end_date: MoreThanOrEqual(now)
        },
        {
          company_code: companyCode,
          status: 'active',
          start_date: LessThanOrEqual(now),
          end_date: IsNull()
        },
        {
          company_code: companyCode,
          status: 'active',
          start_date: IsNull(),
          end_date: MoreThanOrEqual(now)
        },
        {
          company_code: companyCode,
          status: 'active',
          start_date: IsNull(),
          end_date: IsNull()
        }
      ],
      order: { sort_order: 'DESC', created_at: 'DESC' }
    })
  }

  // 獲取單個彈窗公告
  async findOne(id: number): Promise<PopupAnnouncement | null> {
    return await this.popupAnnouncementRepository.findOne({ where: { id } })
  }

  // 更新彈窗公告
  async update(id: number, updateDto: UpdatePopupAnnouncementDto): Promise<PopupAnnouncement | null> {
    await this.popupAnnouncementRepository.update(id, updateDto)
    return await this.findOne(id)
  }

  // 刪除彈窗公告
  async remove(id: number): Promise<void> {
    await this.popupAnnouncementRepository.delete(id)
  }


  // 文件上傳處理
  async uploadImage(file: Express.Multer.File, type: 'desktop' | 'mobile'): Promise<string> {
    // 這裡實現文件上傳邏輯，返回文件路徑
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.originalname.split('.').pop()}`
    const filePath = `/uploads/popup-announcement/${fileName}`
    
    // 實際的文件保存邏輯需要根據您的文件存儲方式實現
    // 這裡只是返回路徑示例
    return filePath
  }
}