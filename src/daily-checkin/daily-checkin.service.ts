import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DailyCheckinConfig } from './daily-checkin-config.entity';
import { UserDailyCheckin } from './user-daily-checkin.entity';
import { UserCheckinStatus } from './user-checkin-status.entity';
import { CreateCheckinConfigDto } from './dto/create-checkin-config.dto';
import { UpdateCheckinConfigDto } from './dto/update-checkin-config.dto';
import { CheckinResponseDto, CheckinStatusDto } from './dto/checkin-response.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class DailyCheckinService {
  constructor(
    @InjectRepository(DailyCheckinConfig)
    private configRepository: Repository<DailyCheckinConfig>,
    @InjectRepository(UserDailyCheckin)
    private checkinRepository: Repository<UserDailyCheckin>,
    @InjectRepository(UserCheckinStatus)
    private statusRepository: Repository<UserCheckinStatus>,
    private userService: UserService,
  ) {}

  // 管理員功能：創建簽到配置
  async createConfig(createDto: CreateCheckinConfigDto): Promise<DailyCheckinConfig> {
    const existingConfig = await this.configRepository.findOne({
      where: { company_id: createDto.company_id, day_number: createDto.day_number }
    });

    if (existingConfig) {
      throw new BadRequestException(`第 ${createDto.day_number} 天的配置已存在`);
    }

    const config = this.configRepository.create(createDto);
    return await this.configRepository.save(config);
  }

  // 管理員功能：更新簽到配置
  async updateConfig(id: number, updateDto: UpdateCheckinConfigDto): Promise<DailyCheckinConfig> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    Object.assign(config, updateDto);
    return await this.configRepository.save(config);
  }

  // 管理員功能：刪除簽到配置
  async deleteConfig(id: number): Promise<void> {
    const result = await this.configRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('配置不存在');
    }
  }

  // 管理員功能：獲取公司的簽到配置（包含時間檢查）
  async getConfigs(companyId: number): Promise<DailyCheckinConfig[]> {
    const now = new Date();
    
    return await this.configRepository
      .createQueryBuilder('config')
      .where('config.company_id = :companyId', { companyId })
      .andWhere('config.is_active = true')
      .andWhere(
        '(config.start_date IS NULL OR config.start_date <= :now)',
        { now }
      )
      .andWhere(
        '(config.end_date IS NULL OR config.end_date >= :now)',
        { now }
      )
      .orderBy('config.day_number', 'ASC')
      .getMany();
  }

  // 管理員功能：獲取所有簽到配置（不檢查時間，用於管理介面）
  async getAllConfigs(companyId: number): Promise<DailyCheckinConfig[]> {
    return await this.configRepository.find({
      where: { company_id: companyId },
      order: { day_number: 'ASC' }
    });
  }

  // 管理員功能：關閉活動（設定結束時間為現在）
  async closeActivity(companyId: number, activityName?: string): Promise<{ message: string; affectedCount: number }> {
    const now = new Date();
    
    const queryBuilder = this.configRepository
      .createQueryBuilder()
      .update(DailyCheckinConfig)
      .set({ end_date: now })
      .where('company_id = :companyId', { companyId })
      .andWhere('is_active = true')
      .andWhere('(end_date IS NULL OR end_date > :now)', { now });

    if (activityName) {
      queryBuilder.andWhere('activity_name = :activityName', { activityName });
    }

    const result = await queryBuilder.execute();
    
    return {
      message: activityName 
        ? `活動「${activityName}」已關閉` 
        : '所有進行中的簽到活動已關閉',
      affectedCount: result.affected || 0
    };
  }

  // 管理員功能：刪除整個活動
  async deleteActivity(companyId: number, activityName: string): Promise<{ message: string; deletedCount: number }> {
    if (!activityName) {
      throw new BadRequestException('活動名稱不能為空');
    }

    const result = await this.configRepository.delete({
      company_id: companyId,
      activity_name: activityName
    });

    return {
      message: `活動「${activityName}」已刪除`,
      deletedCount: result.affected || 0
    };
  }

  // 管理員功能：獲取活動列表
  async getActivities(companyId: number): Promise<any[]> {
    const activities = await this.configRepository
      .createQueryBuilder('config')
      .select('config.activity_name', 'activityName')
      .addSelect('MIN(config.start_date)', 'startDate')
      .addSelect('MAX(config.end_date)', 'endDate')
      .addSelect('COUNT(*)', 'dayCount')
      .addSelect('MIN(config.is_active)', 'isActive')
      .where('config.company_id = :companyId', { companyId })
      .andWhere('config.activity_name IS NOT NULL')
      .groupBy('config.activity_name')
      .orderBy('MIN(config.created_at)', 'DESC')
      .getRawMany();

    const now = new Date();
    
    return activities.map(activity => ({
      activityName: activity.activityName,
      startDate: activity.startDate,
      endDate: activity.endDate,
      dayCount: parseInt(activity.dayCount),
      isActive: activity.isActive,
      status: this.getActivityStatus(activity.startDate, activity.endDate, now)
    }));
  }

  // 輔助方法：判斷活動狀態
  private getActivityStatus(startDate: Date, endDate: Date, now: Date): string {
    if (!startDate && !endDate) return '永久活動';
    if (startDate && now < startDate) return '未開始';
    if (endDate && now > endDate) return '已結束';
    return '進行中';
  }

  // 用戶功能：獲取簽到狀態
  async getCheckinStatus(userId: number, companyId: number): Promise<CheckinStatusDto> {
    // 獲取用戶簽到狀態
    let userStatus = await this.statusRepository.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    if (!userStatus) {
      userStatus = this.statusRepository.create({
        user_id: userId,
        company_id: companyId,
        consecutive_days: 0,
        total_checkins: 0
      });
      await this.statusRepository.save(userStatus);
    }

    // 檢查今天是否已簽到
    const today = new Date().toISOString().split('T')[0];
    const todayCheckin = await this.checkinRepository.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId, 
        checkin_date: new Date(today)
      }
    });

    // 檢查連續性
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let consecutiveDays = userStatus.consecutive_days;
    if (userStatus.last_checkin_date) {
      const lastCheckinDate = new Date(userStatus.last_checkin_date);
      const lastCheckinStr = lastCheckinDate.toISOString().split('T')[0];
      if (lastCheckinStr !== yesterdayStr && lastCheckinStr !== today) {
        // 簽到中斷，重置連續天數
        consecutiveDays = 0;
      }
    }

    // 獲取簽到配置
    const configs = await this.getConfigs(companyId);
    
    // 計算下一個獎勵
    const nextDayNumber = todayCheckin ? consecutiveDays + 1 : consecutiveDays + 1;
    const nextReward = configs.find(c => c.day_number === nextDayNumber);

    // 組裝簽到配置狀態
    const checkinConfigs = configs.map(config => ({
      day_number: config.day_number,
      reward_type: config.reward_type,
      reward_value: config.reward_value,
      reward_description: config.reward_description,
      is_completed: consecutiveDays >= config.day_number
    }));

    return {
      can_checkin: !todayCheckin,
      consecutive_days: consecutiveDays,
      total_checkins: userStatus.total_checkins,
      last_checkin_date: userStatus.last_checkin_date,
      today_checked: !!todayCheckin,
      next_reward: nextReward ? {
        day_number: nextReward.day_number,
        reward_type: nextReward.reward_type,
        reward_value: nextReward.reward_value,
        reward_description: nextReward.reward_description
      } : null,
      checkin_configs: checkinConfigs
    };
  }

  // 用戶功能：執行簽到
  async performCheckin(userId: number, companyId: number): Promise<CheckinResponseDto> {
    // 檢查今天是否已簽到
    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = await this.checkinRepository.findOne({
      where: { 
        user_id: userId, 
        company_id: companyId, 
        checkin_date: new Date(today)
      }
    });

    if (existingCheckin) {
      return {
        success: false,
        message: '今天已經簽到過了'
      };
    }

    // 獲取或創建用戶簽到狀態
    let userStatus = await this.statusRepository.findOne({
      where: { user_id: userId, company_id: companyId }
    });

    if (!userStatus) {
      userStatus = this.statusRepository.create({
        user_id: userId,
        company_id: companyId,
        consecutive_days: 0,
        total_checkins: 0
      });
    }

    // 檢查連續性
    let consecutiveDays = 1;
    if (userStatus.last_checkin_date) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const lastCheckinDate = new Date(userStatus.last_checkin_date);
      const lastCheckinStr = lastCheckinDate.toISOString().split('T')[0];
      
      if (lastCheckinStr === yesterdayStr) {
        consecutiveDays = userStatus.consecutive_days + 1;
      }
    }

    // 獲取對應的獎勵配置
    let rewardConfig = await this.configRepository.findOne({
      where: { 
        company_id: companyId, 
        day_number: consecutiveDays,
        is_active: true 
      }
    });

    if (!rewardConfig) {
      // 如果沒有對應天數的配置，使用循環獎勵或默認獎勵
      const configs = await this.getConfigs(companyId);
      const maxDay = Math.max(...configs.map(c => c.day_number));
      const cycleDay = ((consecutiveDays - 1) % maxDay) + 1;
      const fallbackConfig = configs.find(c => c.day_number === cycleDay);
      
      if (!fallbackConfig) {
        return {
          success: false,
          message: '沒有可用的簽到獎勵配置'
        };
      }
      
      // 創建一個臨時的獎勵配置對象
      rewardConfig = {
        id: 0,
        company_id: companyId,
        day_number: consecutiveDays,
        reward_type: fallbackConfig.reward_type,
        reward_value: fallbackConfig.reward_value,
        reward_description: fallbackConfig.reward_description,
        is_active: true,
        activity_name: fallbackConfig.activity_name,
        start_date: fallbackConfig.start_date,
        end_date: fallbackConfig.end_date,
        created_at: new Date(),
        updated_at: new Date(),
        company: undefined as any
      };
    }

    // 創建簽到記錄
    const checkinRecord = this.checkinRepository.create({
      user_id: userId,
      company_id: companyId,
      checkin_date: new Date(today),
      day_number: consecutiveDays,
      reward_type: rewardConfig!.reward_type,
      reward_value: rewardConfig!.reward_value,
      reward_description: rewardConfig!.reward_description,
      is_received: true
    });

    await this.checkinRepository.save(checkinRecord);

    // 更新用戶狀態
    userStatus.consecutive_days = consecutiveDays;
    userStatus.total_checkins += 1;
    userStatus.last_checkin_date = new Date(today);
    await this.statusRepository.save(userStatus);

    // 發放獎勵
    try {
      if (rewardConfig!.reward_type === 'cash' && rewardConfig!.reward_value > 0) {
        // 發放現金獎勵到用戶錢包
        await this.userService.updateBalance(
          userId,
          rewardConfig!.reward_value,
          `每日簽到獎勵：第${consecutiveDays}天簽到`,
          { id: userId, role: 'USER', company_id: companyId } as any, // 簡化的 JwtUser 對象
          '127.0.0.1',
          'Daily Checkin System'
        );
      }
      // TODO: 可以在這裡添加其他類型的獎勵發放邏輯
      // 例如：points (點數)、coupon (優惠券) 等
    } catch (error) {
      console.error('發放簽到獎勵失敗:', error);
      // 即使獎勵發放失敗，簽到仍然算成功，但要記錄錯誤
    }

    return {
      success: true,
      message: '簽到成功！',
      data: {
        day_number: consecutiveDays,
        reward_type: rewardConfig!.reward_type,
        reward_value: rewardConfig!.reward_value,
        reward_description: rewardConfig!.reward_description,
        consecutive_days: consecutiveDays,
        total_checkins: userStatus.total_checkins
      }
    };
  }

  // 管理員功能：獲取簽到統計
  async getCheckinStats(companyId: number): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    // 今日簽到人數
    const todayCount = await this.checkinRepository.count({
      where: { 
        company_id: companyId, 
        checkin_date: new Date(today)
      }
    });

    // 總簽到人數
    const totalUsers = await this.statusRepository.count({
      where: { company_id: companyId }
    });

    // 連續簽到排行 - 暫時使用簡單查詢避免錯誤
    let topConsecutive: UserCheckinStatus[] = [];
    try {
      // 先檢查是否有簽到狀態記錄
      const statusCount = await this.statusRepository.count({
        where: { company_id: companyId }
      });
      
      if (statusCount > 0) {
        topConsecutive = await this.statusRepository.find({
          where: { 
            company_id: companyId,
            consecutive_days: MoreThan(0)
          },
          order: { 
            consecutive_days: 'DESC',
            total_checkins: 'DESC'
          },
          take: 10,
          relations: ['user']
        });
        
        // 過濾掉非一般用戶
        topConsecutive = topConsecutive.filter(status => 
          status.user && status.user.role === 'USER'
        );
      }
    } catch (error) {
      console.error('排行榜查詢錯誤:', error);
      topConsecutive = [];
    }

    return {
      today_checkins: todayCount,
      total_users: totalUsers,
      top_consecutive: topConsecutive
    };
  }
}