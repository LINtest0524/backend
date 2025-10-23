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
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';
import { MenuDeviceType } from './menu.entity';

@Controller('menu')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER, UserRole.AGENT_LEVEL_1, UserRole.AGENT_LEVEL_2, UserRole.AGENT_LEVEL_3, UserRole.AGENT_LEVEL_4)
  create(@Body() createMenuDto: CreateMenuDto, @Request() req) {
    return this.menuService.create(createMenuDto, req.user);
  }

  @Get('company/:companyId')
  findByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('deviceType') deviceType?: MenuDeviceType,
  ) {
    return this.menuService.findByCompany(companyId, deviceType);
  }

  @Get('admin/company/:companyId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER, UserRole.AGENT_LEVEL_1, UserRole.AGENT_LEVEL_2, UserRole.AGENT_LEVEL_3, UserRole.AGENT_LEVEL_4)
  findAllByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Request() req,
  ) {
    return this.menuService.findAllByCompany(companyId, req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER, UserRole.AGENT_LEVEL_1, UserRole.AGENT_LEVEL_2, UserRole.AGENT_LEVEL_3, UserRole.AGENT_LEVEL_4)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.menuService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER, UserRole.AGENT_LEVEL_1, UserRole.AGENT_LEVEL_2, UserRole.AGENT_LEVEL_3, UserRole.AGENT_LEVEL_4)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMenuDto: UpdateMenuDto,
    @Request() req,
  ) {
    return this.menuService.update(id, updateMenuDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER, UserRole.AGENT_LEVEL_1, UserRole.AGENT_LEVEL_2, UserRole.AGENT_LEVEL_3, UserRole.AGENT_LEVEL_4)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.menuService.remove(id, req.user);
  }

  @Patch('sort-order/batch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER, UserRole.AGENT_LEVEL_1, UserRole.AGENT_LEVEL_2, UserRole.AGENT_LEVEL_3, UserRole.AGENT_LEVEL_4)
  updateSortOrder(
    @Body() updates: { id: number; sort_order: number }[],
    @Request() req,
  ) {
    return this.menuService.updateSortOrder(updates, req.user);
  }
}