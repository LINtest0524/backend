import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Headers,
  NotFoundException,
  Request
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { PopupAnnouncementService } from './popup-announcement.service'
import { CreatePopupAnnouncementDto } from './dto/create-popup-announcement.dto'
import { UpdatePopupAnnouncementDto } from './dto/update-popup-announcement.dto'
import { diskStorage } from 'multer'
import { extname } from 'path'

@Controller('popup-announcements')
export class PopupAnnouncementController {
  constructor(private readonly popupAnnouncementService: PopupAnnouncementService) {}

  // 後台管理 - 創建彈窗公告
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  create(@Request() req: any, @Body() createDto: CreatePopupAnnouncementDto) {
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 代理商建立的彈窗公告自動設定為自己的公司
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      createDto.company_code = userCompanyId.toString();
    }
    
    return this.popupAnnouncementService.create(createDto)
  }

  // 後台管理 - 獲取所有彈窗公告
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  findAll(@Request() req: any, @Query('company') companyCode: string) {
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能查看自己公司的彈窗公告
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      // 代理商只能查看自己公司的公告，忽略前端傳來的 company 參數
      companyCode = userCompanyId.toString();
    }
    
    return this.popupAnnouncementService.findAll(companyCode)
  }

  // 後台管理 - 獲取單個彈窗公告
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const result = await this.popupAnnouncementService.findOne(+id)
    if (!result) {
      throw new NotFoundException('彈窗公告不存在')
    }
    
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能查看自己公司的彈窗公告
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (result.company_code !== userCompanyId.toString()) {
        throw new NotFoundException('彈窗公告不存在')
      }
    }
    
    return result
  }

  // 後台管理 - 更新彈窗公告
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async update(@Request() req: any, @Param('id') id: string, @Body() updateDto: UpdatePopupAnnouncementDto) {
    const result = await this.popupAnnouncementService.findOne(+id)
    if (!result) {
      throw new NotFoundException('彈窗公告不存在')
    }
    
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的彈窗公告
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (result.company_code !== userCompanyId.toString()) {
        throw new NotFoundException('彈窗公告不存在')
      }
    }
    
    return this.popupAnnouncementService.update(+id, updateDto)
  }

  // 後台管理 - 刪除彈窗公告
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async remove(@Request() req: any, @Param('id') id: string) {
    const result = await this.popupAnnouncementService.findOne(+id)
    if (!result) {
      throw new NotFoundException('彈窗公告不存在')
    }
    
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能刪除自己公司的彈窗公告
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (result.company_code !== userCompanyId.toString()) {
        throw new NotFoundException('彈窗公告不存在')
      }
    }
    
    return this.popupAnnouncementService.remove(+id)
  }

  // 文件上傳 - 桌面版圖片
  @Post('upload/desktop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads/popup-announcement',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
        cb(null, `${randomName}${extname(file.originalname)}`)
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('只允許上傳圖片文件'), false)
      }
      cb(null, true)
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  uploadDesktopImage(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: `/uploads/popup-announcement/${file.filename}`,
      size: file.size
    }
  }

  // 文件上傳 - 手機版圖片
  @Post('upload/mobile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads/popup-announcement',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
        cb(null, `${randomName}${extname(file.originalname)}`)
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('只允許上傳圖片文件'), false)
      }
      cb(null, true)
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  uploadMobileImage(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: `/uploads/popup-announcement/${file.filename}`,
      size: file.size
    }
  }

}