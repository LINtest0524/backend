import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const userId = req.user?.userId;
    return this.userService.findById(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'AGENT_OWNER')
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req,
  ): Promise<User> {
    const fullUser = await this.userService.findById(req.user.userId);
    return this.userService.create(createUserDto, fullUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Get()
  async findAll(@Request() req, @Query() query: any) {
    const user = req.user;

    if (!user.companyId && user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      throw new UnauthorizedException('無法辨識所屬公司');
    }

    const result = await this.userService.findAll(user, query);

    return {
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      data: result.data,
    };
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('admin-only')
  getAdminOnlyRoute() {
    return { message: '你是管理員，歡迎進入此路由！' };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.userService.findOneWithModules(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.userService.update(id, updateUserDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.userId;
    return this.userService.changePassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number, @Request() req) {
    const user = req.user;
    if (user.role === 'AGENT_SUPPORT') {
      throw new ForbiddenException('AGENT_SUPPORT 不可刪除使用者');
    }
    return this.userService.softDelete(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/unblacklist')
  async removeFromBlacklist(@Param('id') id: number, @Request() req) {
    return this.userService.update(id, { is_blacklisted: false }, req.user);
  }
}
