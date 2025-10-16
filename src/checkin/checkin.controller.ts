import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { PutDayRewardsDto } from './dto/put-day-rewards.dto';
import { PutThresholdsDto } from './dto/put-thresholds.dto';
import { SimulateDto } from './dto/simulate.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get('activities')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findActivities(
    @Request() req,
    @Query('activityType') activityType?: string,
    @Query('companyId') companyId?: number,
    @Query('isEnabled') isEnabled?: boolean,
    @Query('q') searchQuery?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    const user = req.user;
    
    // 根據用戶角色決定 companyId 篩選
    let filterCompanyId = companyId;
    if (user.role === 'AGENT_OWNER' || user.role === 'AGENT_SUPPORT') {
      filterCompanyId = user.companyId; // 強制使用用戶的公司 ID
    }
    
    return this.checkinService.findActivities({
      activityType,
      companyId: filterCompanyId,
      isEnabled,
      searchQuery,
      page,
      pageSize,
    });
  }

  @Get('activities/:id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findActivity(@Param('id', ParseIntPipe) id: number) {
    return this.checkinService.findActivityById(id);
  }

  @Post('activities')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async createActivity(@Request() req, @Body() createActivityDto: CreateActivityDto) {
    const user = req.user;
    
    // 代理商只能為自己的公司建立活動
    if (user.role === 'AGENT_OWNER') {
      createActivityDto.companyId = user.companyId;
    }
    
    return this.checkinService.createActivity(createActivityDto);
  }

  @Put('activities/:id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async updateActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.checkinService.updateActivity(id, updateActivityDto);
  }

  @Patch('activities/:id/status')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async updateActivityStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: { isEnabled?: boolean; publishAt?: string },
  ) {
    return this.checkinService.updateActivityStatus(id, statusDto);
  }

  @Delete('activities/:id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async deleteActivity(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const user = req.user;
    return this.checkinService.deleteActivity(id, user);
  }

  @Get('activities/:id/day-rewards')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async getDayRewards(@Param('id', ParseIntPipe) id: number) {
    return this.checkinService.getDayRewards(id);
  }

  @Put('activities/:id/day-rewards')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async putDayRewards(
    @Param('id', ParseIntPipe) id: number,
    @Body() putDayRewardsDto: PutDayRewardsDto,
  ) {
    return this.checkinService.putDayRewards(id, putDayRewardsDto);
  }

  @Put('activities/:id/thresholds')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async putThresholds(
    @Param('id', ParseIntPipe) id: number,
    @Body() putThresholdsDto: PutThresholdsDto,
  ) {
    return this.checkinService.putThresholds(id, putThresholdsDto);
  }

  @Post('activities/:id/simulate/next-step')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async simulateNextStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() simulateDto: SimulateDto,
  ) {
    return this.checkinService.simulateNextStep(id, simulateDto);
  }

  @Get('activities/:id/progress/:userId')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async getUserProgress(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.checkinService.getUserProgress(id, userId);
  }

}