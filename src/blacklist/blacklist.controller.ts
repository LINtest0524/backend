import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard'; // ⬅️ 加這個
import { Roles } from '../auth/roles.decorator';
import { BlacklistService } from './blacklist.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';

@UseGuards(JwtAuthGuard, RolesGuard) //   加這一行套用到整個 controller
@Controller('blacklist')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Post()
  async create(@Body() dto: CreateBlacklistDto, @Request() req) {
    return this.blacklistService.create(dto, req.user.companyId);
  }

  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Get()
  async findAll(@Request() req) {
    return this.blacklistService.findAll(req.user.companyId);
  }

  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.blacklistService.remove(id);
  }
}
