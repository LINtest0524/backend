import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { LogoService } from './logo.service';
import { CreateLogoDto } from './dto/create-logo.dto';
import { UpdateLogoDto } from './dto/update-logo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';

@Controller('logo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogoController {
  constructor(private readonly logoService: LogoService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  create(@Body() createLogoDto: CreateLogoDto, @Request() req) {
    const companyId = req.user.role === UserRole.AGENT_OWNER 
      ? req.user.company_id 
      : (createLogoDto as any).companyId || req.user.company_id;
    
    return this.logoService.create(createLogoDto, companyId);
  }

  @Post('upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads/logo',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    return {
      filename: file.filename,
      path: `/uploads/logo/${file.filename}`,
      size: file.size,
    };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  findAll(@Request() req) {
    return this.logoService.findAll(req.user.role, req.user.company_id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.logoService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLogoDto: UpdateLogoDto,
    @Request() req,
  ) {
    return this.logoService.update(id, updateLogoDto, req.user.role, req.user.company_id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.logoService.remove(id, req.user.role, req.user.company_id);
  }
}