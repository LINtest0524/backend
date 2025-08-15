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
  NotFoundException
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
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  create(@Body() createDto: CreatePopupAnnouncementDto) {
    return this.popupAnnouncementService.create(createDto)
  }

  // 後台管理 - 獲取所有彈窗公告
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  findAll(@Query('company') companyCode: string) {
    return this.popupAnnouncementService.findAll(companyCode)
  }

  // 後台管理 - 獲取單個彈窗公告
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findOne(@Param('id') id: string) {
    const result = await this.popupAnnouncementService.findOne(+id)
    if (!result) {
      throw new NotFoundException('彈窗公告不存在')
    }
    return result
  }

  // 後台管理 - 更新彈窗公告
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async update(@Param('id') id: string, @Body() updateDto: UpdatePopupAnnouncementDto) {
    const result = await this.popupAnnouncementService.update(+id, updateDto)
    if (!result) {
      throw new NotFoundException('彈窗公告不存在')
    }
    return result
  }

  // 後台管理 - 刪除彈窗公告
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  remove(@Param('id') id: string) {
    return this.popupAnnouncementService.remove(+id)
  }

  // 文件上傳 - 桌面版圖片
  @Post('upload/desktop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
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
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
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