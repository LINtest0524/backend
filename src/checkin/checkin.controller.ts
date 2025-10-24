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
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
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
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      // 所有代理商角色只能查看自己公司的活動
      filterCompanyId = user.companyId || user.company_id;
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
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async findActivity(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能查看自己公司的活動
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限訪問此活動');
      }
    }
    
    return activity;
  }

  @Post('activities')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async createActivity(@Request() req, @Body() createActivityDto: CreateActivityDto) {
    const user = req.user;
    
    // 代理商只能為自己的公司建立活動
    if (user.role === 'AGENT_OWNER' || 
        user.role === 'AGENT_LEVEL_1' || 
        user.role === 'AGENT_LEVEL_2' || 
        user.role === 'AGENT_LEVEL_3' || 
        user.role === 'AGENT_LEVEL_4') {
      createActivityDto.companyId = user.companyId || user.company_id;
    }
    
    return this.checkinService.createActivity(createActivityDto);
  }

  @Put('activities/:id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async updateActivity(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的活動
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限修改此活動');
      }
    }
    
    return this.checkinService.updateActivity(id, updateActivityDto);
  }

  @Patch('activities/:id/status')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async updateActivityStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: { isEnabled?: boolean; publishAt?: string },
  ) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的活動狀態
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限修改此活動狀態');
      }
    }
    
    return this.checkinService.updateActivityStatus(id, statusDto);
  }

  @Delete('activities/:id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async deleteActivity(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能刪除自己公司的活動
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限刪除此活動');
      }
    }
    
    return this.checkinService.deleteActivity(id, user);
  }

  @Get('activities/:id/day-rewards')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async getDayRewards(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能查看自己公司的活動獎勵
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限查看此活動獎勵');
      }
    }
    
    return this.checkinService.getDayRewards(id);
  }

  @Put('activities/:id/day-rewards')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async putDayRewards(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() putDayRewardsDto: PutDayRewardsDto,
  ) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的活動獎勵
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限修改此活動獎勵');
      }
    }
    
    return this.checkinService.putDayRewards(id, putDayRewardsDto);
  }

  @Put('activities/:id/thresholds')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async putThresholds(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() putThresholdsDto: PutThresholdsDto,
  ) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的活動門檻
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限修改此活動門檻');
      }
    }
    
    return this.checkinService.putThresholds(id, putThresholdsDto);
  }

  @Post('activities/:id/simulate/next-step')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async simulateNextStep(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() simulateDto: SimulateDto,
  ) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能模擬自己公司的活動
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限模擬此活動');
      }
    }
    
    return this.checkinService.simulateNextStep(id, simulateDto);
  }

  @Get('activities/:id/progress/:userId')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async getUserProgress(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const activity = await this.checkinService.findActivityById(id);
    const user = req.user;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能查看自己公司活動的用戶進度
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (activity.companyId !== userCompanyId) {
        throw new Error('無權限查看此活動的用戶進度');
      }
    }
    
    return this.checkinService.getUserProgress(id, userId);
  }

}