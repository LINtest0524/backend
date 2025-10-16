import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DailyCheckinEvent } from './daily-checkin-event.entity';
import { DailyCheckinReward } from './daily-checkin-reward.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateRewardDto, BatchCreateRewardsDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

@Injectable()
export class DailyCheckinEventService {
  constructor(
    @InjectRepository(DailyCheckinEvent)
    private eventRepository: Repository<DailyCheckinEvent>,
    @InjectRepository(DailyCheckinReward)
    private rewardRepository: Repository<DailyCheckinReward>,
  ) {}

  // ========== 活動管理 ==========

  // 創建活動
  async createEvent(createEventDto: CreateEventDto): Promise<DailyCheckinEvent> {
    // 驗證時間邏輯
    if (createEventDto.start_date >= createEventDto.end_date) {
      throw new BadRequestException('開始時間必須早於結束時間');
    }

    // 檢查是否有重疊的活動
    const overlappingEvent = await this.eventRepository.findOne({
      where: {
        company_id: createEventDto.company_id,
        start_date: Between(createEventDto.start_date, createEventDto.end_date),
      },
    });

    if (overlappingEvent) {
      throw new BadRequestException('活動時間與現有活動重疊');
    }

    const event = this.eventRepository.create(createEventDto);
    return await this.eventRepository.save(event);
  }

  // 獲取公司所有活動
  async getEvents(companyId: number): Promise<DailyCheckinEvent[]> {
    return await this.eventRepository.find({
      where: { company_id: companyId },
      relations: ['rewards'],
      order: { start_date: 'DESC' }
    });
  }

  // 獲取當前有效的活動
  async getActiveEvents(companyId: number): Promise<DailyCheckinEvent[]> {
    const now = new Date();
    
    return await this.eventRepository.find({
      where: {
        company_id: companyId,
        is_active: true,
      },
      relations: ['rewards'],
      order: { start_date: 'ASC' }
    });
  }

  // 獲取特定活動
  async getEvent(id: number): Promise<DailyCheckinEvent> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['rewards']
    });

    if (!event) {
      throw new NotFoundException('活動不存在');
    }

    return event;
  }

  // 更新活動
  async updateEvent(id: number, updateEventDto: UpdateEventDto): Promise<DailyCheckinEvent> {
    const event = await this.getEvent(id);

    // 驗證時間邏輯
    if (updateEventDto.start_date && updateEventDto.end_date) {
      if (updateEventDto.start_date >= updateEventDto.end_date) {
        throw new BadRequestException('開始時間必須早於結束時間');
      }
    }

    Object.assign(event, updateEventDto);
    return await this.eventRepository.save(event);
  }

  // 刪除活動
  async deleteEvent(id: number): Promise<{ message: string }> {
    const event = await this.getEvent(id);
    await this.eventRepository.remove(event);
    return { message: '活動已刪除' };
  }

  // 複製活動
  async duplicateEvent(id: number, newName: string, newStartDate: Date, newEndDate: Date): Promise<DailyCheckinEvent> {
    const originalEvent = await this.getEvent(id);
    
    // 創建新活動
    const newEvent = await this.createEvent({
      company_id: originalEvent.company_id,
      name: newName,
      description: originalEvent.description,
      start_date: newStartDate,
      end_date: newEndDate,
      total_days: originalEvent.total_days,
      is_active: false // 複製的活動預設為停用
    });

    // 複製獎勵配置
    for (const reward of originalEvent.rewards) {
      await this.createReward({
        event_id: newEvent.id,
        day_number: reward.day_number,
        reward_type: reward.reward_type,
        reward_value: reward.reward_value,
        reward_description: reward.reward_description
      });
    }

    return await this.getEvent(newEvent.id);
  }

  // ========== 獎勵配置管理 ==========

  // 創建單個獎勵
  async createReward(createRewardDto: CreateRewardDto): Promise<DailyCheckinReward> {
    // 檢查活動是否存在
    await this.getEvent(createRewardDto.event_id);

    // 檢查該天是否已有獎勵
    const existingReward = await this.rewardRepository.findOne({
      where: {
        event_id: createRewardDto.event_id,
        day_number: createRewardDto.day_number
      }
    });

    if (existingReward) {
      throw new BadRequestException(`第 ${createRewardDto.day_number} 天已有獎勵配置`);
    }

    const reward = this.rewardRepository.create(createRewardDto);
    return await this.rewardRepository.save(reward);
  }

  // 批量創建獎勵
  async batchCreateRewards(batchDto: BatchCreateRewardsDto): Promise<DailyCheckinReward[]> {
    // 檢查活動是否存在
    await this.getEvent(batchDto.event_id);

    const rewards: DailyCheckinReward[] = [];
    for (const rewardDto of batchDto.rewards) {
      rewardDto.event_id = batchDto.event_id;
      const reward = await this.createReward(rewardDto);
      rewards.push(reward);
    }

    return rewards;
  }

  // 更新獎勵
  async updateReward(id: number, updateRewardDto: UpdateRewardDto): Promise<DailyCheckinReward> {
    const reward = await this.rewardRepository.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException('獎勵配置不存在');
    }

    Object.assign(reward, updateRewardDto);
    return await this.rewardRepository.save(reward);
  }

  // 刪除獎勵
  async deleteReward(id: number): Promise<{ message: string }> {
    const reward = await this.rewardRepository.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException('獎勵配置不存在');
    }

    await this.rewardRepository.remove(reward);
    return { message: '獎勵配置已刪除' };
  }

  // 獲取活動的所有獎勵
  async getEventRewards(eventId: number): Promise<DailyCheckinReward[]> {
    return await this.rewardRepository.find({
      where: { event_id: eventId },
      order: { day_number: 'ASC' }
    });
  }

  // ========== 實用工具方法 ==========

  // 檢查活動是否在進行中
  isEventActive(event: DailyCheckinEvent): boolean {
    const now = new Date();
    return event.is_active && 
           now >= event.start_date && 
           now <= event.end_date;
  }

  // 獲取活動狀態文字
  getEventStatus(event: DailyCheckinEvent): string {
    const now = new Date();
    
    if (!event.is_active) return '已停用';
    if (now < event.start_date) return '未開始';
    if (now > event.end_date) return '已結束';
    return '進行中';
  }
}