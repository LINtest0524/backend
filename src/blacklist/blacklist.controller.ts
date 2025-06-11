import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard'; // ⬅️ 加這個
import { Roles } from '../auth/roles.decorator';
import { BlacklistService } from './blacklist.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';

@UseGuards(JwtAuthGuard, RolesGuard) // ✅ 加這一行套用到整個 controller
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateBlacklistDto) {
    return this.blacklistService.create(dto);
  }

  @Roles('ADMIN')
  @Get()
  async findAll() {
    return this.blacklistService.findAll();
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.blacklistService.remove(id);
  }
}
