import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';
import { DailyCheckinEventService } from './daily-checkin-event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateRewardDto, BatchCreateRewardsDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

@Controller('daily-checkin-v2')
@UseGuards(JwtAuthGuard)
export class DailyCheckinEventController {
  constructor(private readonly eventService: DailyCheckinEventService) {}

  // ========== 活動管理 API ==========

  // 創建活動
  @Post('events')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return await this.eventService.createEvent(createEventDto);
  }

  // 獲取公司所有活動
  @Get('events')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async getEvents(@Query('company_id') companyId: number) {
    const events = await this.eventService.getEvents(companyId);
    
    // 添加狀態信息
    return events.map(event => ({
      ...event,
      status: this.eventService.getEventStatus(event),
      is_currently_active: this.eventService.isEventActive(event)
    }));
  }

  // 獲取當前有效活動
  @Get('events/active')
  async getActiveEvents(@Query('company_id') companyId: number) {
    return await this.eventService.getActiveEvents(companyId);
  }

  // 獲取特定活動
  @Get('events/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async getEvent(@Param('id') id: number) {
    const event = await this.eventService.getEvent(id);
    return {
      ...event,
      status: this.eventService.getEventStatus(event),
      is_currently_active: this.eventService.isEventActive(event)
    };
  }

  // 更新活動
  @Put('events/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER
  )
  async updateEvent(
    @Param('id') id: number,
    @Body() updateEventDto: UpdateEventDto
  ) {
    return await this.eventService.updateEvent(id, updateEventDto);
  }

  // 刪除活動
  @Delete('events/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  async deleteEvent(@Param('id') id: number) {
    return await this.eventService.deleteEvent(id);
  }

  // 複製活動
  @Post('events/:id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async duplicateEvent(
    @Param('id') id: number,
    @Body() body: { name: string; start_date: Date; end_date: Date }
  ) {
    return await this.eventService.duplicateEvent(
      id, 
      body.name, 
      body.start_date, 
      body.end_date
    );
  }

  // ========== 獎勵配置 API ==========

  // 創建獎勵
  @Post('rewards')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async createReward(@Body() createRewardDto: CreateRewardDto) {
    return await this.eventService.createReward(createRewardDto);
  }

  // 批量創建獎勵
  @Post('rewards/batch')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async batchCreateRewards(@Body() batchDto: BatchCreateRewardsDto) {
    return await this.eventService.batchCreateRewards(batchDto);
  }

  // 更新獎勵
  @Put('rewards/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async updateReward(
    @Param('id') id: number,
    @Body() updateRewardDto: UpdateRewardDto
  ) {
    return await this.eventService.updateReward(id, updateRewardDto);
  }

  // 刪除獎勵
  @Delete('rewards/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  async deleteReward(@Param('id') id: number) {
    return await this.eventService.deleteReward(id);
  }

  // 獲取活動的所有獎勵
  @Get('events/:eventId/rewards')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  async getEventRewards(@Param('eventId') eventId: number) {
    return await this.eventService.getEventRewards(eventId);
  }
}