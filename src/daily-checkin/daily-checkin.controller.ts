import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Req 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';
import { DailyCheckinService } from './daily-checkin.service';
import { CreateCheckinConfigDto } from './dto/create-checkin-config.dto';
import { UpdateCheckinConfigDto } from './dto/update-checkin-config.dto';

@Controller('daily-checkin')
@UseGuards(JwtAuthGuard)
export class DailyCheckinController {
  constructor(private readonly dailyCheckinService: DailyCheckinService) {}

  // 管理員功能：創建簽到配置
  @Post('config')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async createConfig(@Body() createDto: CreateCheckinConfigDto) {
    return await this.dailyCheckinService.createConfig(createDto);
  }

  // 管理員功能：獲取簽到配置列表
  @Get('config')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async getConfigs(@Query('company_id') companyId: number) {
    return await this.dailyCheckinService.getConfigs(companyId);
  }

  // 管理員功能：獲取所有簽到配置（包含過期和未開始的）
  @Get('config/all')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async getAllConfigs(@Query('company_id') companyId: number) {
    return await this.dailyCheckinService.getAllConfigs(companyId);
  }

  // 管理員功能：更新簽到配置
  @Put('config/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async updateConfig(
    @Param('id') id: number,
    @Body() updateDto: UpdateCheckinConfigDto
  ) {
    return await this.dailyCheckinService.updateConfig(id, updateDto);
  }

  // 管理員功能：刪除簽到配置
  @Delete('config/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  async deleteConfig(@Param('id') id: number) {
    await this.dailyCheckinService.deleteConfig(id);
    return { message: '配置已刪除' };
  }

  // 管理員功能：獲取活動列表
  @Get('activities')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async getActivities(@Query('company_id') companyId: number) {
    return await this.dailyCheckinService.getActivities(companyId);
  }

  // 管理員功能：關閉活動
  @Post('activities/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  async closeActivity(
    @Body('company_id') companyId: number,
    @Body('activity_name') activityName?: string
  ) {
    return await this.dailyCheckinService.closeActivity(companyId, activityName);
  }

  // 管理員功能：刪除活動
  @Delete('activities/:activityName')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  async deleteActivity(
    @Param('activityName') activityName: string,
    @Query('company_id') companyId: number
  ) {
    return await this.dailyCheckinService.deleteActivity(companyId, activityName);
  }

  // 管理員功能：獲取簽到統計
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async getStats(@Query('company_id') companyId: number) {
    return await this.dailyCheckinService.getCheckinStats(companyId);
  }

  // 用戶功能：獲取簽到狀態
  @Get('status')
  async getStatus(@Req() req, @Query('company_id') companyId: number) {
    const userId = req.user.id;
    return await this.dailyCheckinService.getCheckinStatus(userId, companyId);
  }

  // 用戶功能：執行簽到
  @Post('checkin')
  async performCheckin(@Req() req, @Body('company_id') companyId: number) {
    const userId = req.user.id;
    return await this.dailyCheckinService.performCheckin(userId, companyId);
  }
}