import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckinActivity, ActivityType } from './entities/checkin-activity.entity';
import { CheckinDayReward } from './entities/checkin-day-reward.entity';
import { CheckinProgress } from './entities/checkin-progress.entity';
import { CheckinLedger } from './entities/checkin-ledger.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { PutDayRewardsDto } from './dto/put-day-rewards.dto';
import { PutThresholdsDto } from './dto/put-thresholds.dto';
import { SimulateDto } from './dto/simulate.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class CheckinService {
  constructor(
    @InjectRepository(CheckinActivity)
    private activityRepository: Repository<CheckinActivity>,
    @InjectRepository(CheckinDayReward)
    private dayRewardRepository: Repository<CheckinDayReward>,
    @InjectRepository(CheckinProgress)
    private progressRepository: Repository<CheckinProgress>,
    @InjectRepository(CheckinLedger)
    private ledgerRepository: Repository<CheckinLedger>,
    private userService: UserService,
  ) {}

  async findActivities(filters: {
    activityType?: string;
    companyId?: number;
    isEnabled?: boolean;
    searchQuery?: string;
    page: number;
    pageSize: number;
  }) {
    const { activityType, companyId, isEnabled, searchQuery, page, pageSize } = filters;
    const queryBuilder = this.activityRepository.createQueryBuilder('activity');

    if (activityType) {
      queryBuilder.andWhere('activity.activityType = :activityType', { activityType });
    }

    if (companyId !== undefined) {
      queryBuilder.andWhere('activity.companyId = :companyId', { companyId });
    }

    if (isEnabled !== undefined) {
      queryBuilder.andWhere('activity.isEnabled = :isEnabled', { isEnabled });
    }

    if (searchQuery) {
      queryBuilder.andWhere('activity.title ILIKE :searchQuery', { 
        searchQuery: `%${searchQuery}%` 
      });
    }

    queryBuilder
      .orderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      page,
      pageSize,
      total,
    };
  }

  async findActivityById(id: number) {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['dayRewards'],
    });
    
    // 如果關聯查詢失敗，手動查詢日次獎勵
    if (activity && (!activity.dayRewards || activity.dayRewards.length === 0)) {
      const dayRewards = await this.dayRewardRepository.find({
        where: { activityId: id },
        order: { dayIndex: 'ASC' }
      });
      activity.dayRewards = dayRewards;
    }

    if (!activity) {
      throw new NotFoundException('活動不存在');
    }


    // 根據活動類型返回相應的資料結構
    const result: any = {
      ...activity,
      dayRewards: activity.dayRewards || [],
    };

    return result;
  }

  async createActivity(createActivityDto: CreateActivityDto) {
    // 驗證日期
    if (new Date(createActivityDto.startDate) > new Date(createActivityDto.endDate)) {
      throw new BadRequestException('開始日期不能晚於結束日期');
    }

    if (createActivityDto.publishAt && new Date(createActivityDto.publishAt) > new Date(createActivityDto.endDate)) {
      throw new BadRequestException('預約上架時間不能晚於結束日期');
    }

    // 驗證天數欄位
    const needsDays = [ActivityType.STRICT_STREAK_7, ActivityType.DAILY_CALENDAR, ActivityType.FLEX_CUMULATIVE];
    if (needsDays.includes(createActivityDto.activityType) && !createActivityDto.days) {
      throw new BadRequestException('此活動類型需要設定天數');
    }

    const activity = this.activityRepository.create(createActivityDto);
    return this.activityRepository.save(activity);
  }

  async updateActivity(id: number, updateActivityDto: UpdateActivityDto) {
    const activity = await this.findActivityById(id);
    
    // 驗證日期
    const startDate = updateActivityDto.startDate || activity.startDate;
    const endDate = updateActivityDto.endDate || activity.endDate;
    
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('開始日期不能晚於結束日期');
    }

    if (updateActivityDto.publishAt && new Date(updateActivityDto.publishAt) > new Date(endDate)) {
      throw new BadRequestException('預約上架時間不能晚於結束日期');
    }
    
    try {
      // 使用 save 方法避免 trigger 問題
      const existingActivity = await this.findActivityById(id);
      
      Object.assign(existingActivity, updateActivityDto);
      existingActivity.updatedAt = new Date();
      
      await this.activityRepository.save(existingActivity);
      
      return existingActivity;
    } catch (error) {
      throw error;
    }
  }

  async updateActivityStatus(id: number, statusDto: { isEnabled?: boolean; publishAt?: string }) {
    const activity = await this.findActivityById(id);

    if (statusDto.publishAt && new Date(statusDto.publishAt) > new Date(activity.endDate)) {
      throw new BadRequestException('預約上架時間不能晚於結束日期');
    }
    
    try {
      // 使用 save 方法避免 trigger 問題
      const targetActivity = await this.findActivityById(id);
      
      Object.assign(targetActivity, statusDto);
      targetActivity.updatedAt = new Date();
      
      await this.activityRepository.save(targetActivity);
      
      return targetActivity;
    } catch (error) {
      throw error;
    }
  }

  async deleteActivity(id: number, user: any) {
    const activity = await this.findActivityById(id);
    
    // 檢查權限：代理商只能刪除自己公司的活動
    if (user.role === 'AGENT_OWNER') {
      // 如果活動的 companyId 不存在或與用戶的 companyId 不匹配
      if (!activity.companyId || activity.companyId !== user.companyId) {
        throw new BadRequestException(`無權限刪除此活動。活動公司ID: ${activity.companyId}, 用戶公司ID: ${user.companyId}`);
      }
    }
    
    // 檢查活動是否已開始且啟用中
    const now = new Date();
    if (new Date(activity.startDate) <= now && activity.isEnabled) {
      throw new BadRequestException('已開始且啟用中的活動不能刪除，請先停用活動');
    }

    await this.activityRepository.delete(id);
    return { message: '活動已刪除' };
  }

  async getDayRewards(activityId: number) {
    const rewards = await this.dayRewardRepository.find({
      where: { activityId },
      order: { dayIndex: 'ASC' },
    });

    return rewards;
  }

  async putDayRewards(activityId: number, putDayRewardsDto: PutDayRewardsDto) {
    const activity = await this.findActivityById(activityId);

    // 驗證日次獎勵數量與活動天數是否一致（只對需要天數的活動類型進行驗證）
    const needsDaysTypes = ['STRICT_STREAK_7', 'DAILY_CALENDAR', 'FLEX_CUMULATIVE'];
    if (needsDaysTypes.includes(activity.activityType) && activity.days && putDayRewardsDto.dayRewards.length !== activity.days) {
      throw new BadRequestException(`獎勵數量必須等於活動天數 ${activity.days}`);
    }

    // 驗證 dayIndex 是否連續且從 1 開始
    const sortedRewards = putDayRewardsDto.dayRewards.sort((a, b) => a.dayIndex - b.dayIndex);
    for (let i = 0; i < sortedRewards.length; i++) {
      if (sortedRewards[i].dayIndex !== i + 1) {
        throw new BadRequestException('dayIndex 必須從 1 開始且連續');
      }
    }

    // 刪除舊的獎勵設定
    await this.dayRewardRepository.delete({ activityId });

    // 建立新的獎勵設定
    const rewards = putDayRewardsDto.dayRewards.map(reward => 
      this.dayRewardRepository.create({ ...reward, activityId })
    );

    await this.dayRewardRepository.save(rewards);
    return this.getDayRewards(activityId);
  }

  async putThresholds(activityId: number, putThresholdsDto: PutThresholdsDto) {
    const activity = await this.findActivityById(activityId);

    // 驗證活動類型
    if (activity.activityType !== ActivityType.FLEX_CUMULATIVE) {
      throw new BadRequestException('此活動類型不支援門檻獎勵');
    }

    // 驗證門檻遞增且不重複
    const daysRequired = putThresholdsDto.thresholds.map(t => t.daysRequired);
    const sortedDays = [...daysRequired].sort((a, b) => a - b);
    
    if (daysRequired.length !== new Set(daysRequired).size) {
      throw new BadRequestException('門檻天數不能重複');
    }

    for (let i = 0; i < sortedDays.length - 1; i++) {
      if (sortedDays[i] >= sortedDays[i + 1]) {
        throw new BadRequestException('門檻天數必須遞增');
      }
    }

    // 更新 configJson
    const newConfigJson = {
      ...activity.configJson,
      thresholds: putThresholdsDto.thresholds,
    };

    await this.activityRepository.update(activityId, { configJson: newConfigJson });
    return this.findActivityById(activityId);
  }

  async simulateNextStep(activityId: number, simulateDto: SimulateDto) {
    const activity = await this.findActivityById(activityId);
    const { userId, today } = simulateDto;

    // 取得用戶進度
    let progress = await this.progressRepository.findOne({
      where: { activityId, userId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        activityId,
        userId,
        currentStreak: 0,
        totalChecked: 0,
        claimedDaysJson: {},
      });
    }

    const todayDate = new Date(today);
    const lastCheckinDate = progress.lastCheckinDate ? new Date(progress.lastCheckinDate) : null;

    // 計算簽到結果
    let result: any = {
      today,
      checkedIn: false,
      rewardAvailable: false,
      nextHint: '',
    };

    switch (activity.activityType) {
      case ActivityType.STRICT_STREAK_7:
        result = await this.simulateStrictStreak(progress, todayDate, lastCheckinDate, activity);
        break;
      case ActivityType.FLEX_CUMULATIVE:
        result = await this.simulateFlexCumulative(progress, activity);
        break;
      case ActivityType.DAILY_CALENDAR:
        result = this.simulateDailyCalendar(progress, todayDate, activity);
        break;
    }

    return result;
  }

  private async simulateStrictStreak(progress: CheckinProgress, todayDate: Date, lastCheckinDate: Date | null, activity: CheckinActivity) {
    let newStreak = progress.currentStreak;

    if (!lastCheckinDate || this.getDaysDifference(lastCheckinDate, todayDate) > 1) {
      newStreak = 1; // 重新開始或首次簽到
    } else if (this.getDaysDifference(lastCheckinDate, todayDate) === 1) {
      newStreak = progress.currentStreak + 1; // 連續簽到
    } else {
      return {
        today: todayDate.toISOString().split('T')[0],
        checkedIn: false,
        message: '今日已簽到',
      };
    }

    const dayIndex = Math.min(newStreak, activity.days || 7);
    
    // 查找對應的日次獎勵
    const dayReward = await this.dayRewardRepository.findOne({
      where: { 
        activityId: activity.id, 
        dayIndex: dayIndex 
      }
    });
    
    return {
      today: todayDate.toISOString().split('T')[0],
      checkedIn: true,
      currentStreak: newStreak,
      dayIndex,
      rewardAvailable: !!dayReward,
      reward: dayReward ? {
        rewardType: dayReward.rewardType,
        amount: dayReward.amount
      } : null,
      nextHint: dayIndex < (activity.days || 7) ? `明日繼續簽到可領第${dayIndex + 1}天獎勵` : '已達最高連續天數獎勵',
    };
  }


  private async simulateFlexCumulative(progress: CheckinProgress, activity: CheckinActivity) {
    const newTotal = progress.totalChecked + 1;
    const dayIndex = Math.min(newTotal, activity.days || 7);
    
    // 查找對應的日次獎勵
    const dayReward = await this.dayRewardRepository.findOne({
      where: { 
        activityId: activity.id, 
        dayIndex: dayIndex 
      }
    });

    return {
      checkedIn: true,
      totalChecked: newTotal,
      dayIndex,
      rewardAvailable: !!dayReward,
      reward: dayReward ? {
        rewardType: dayReward.rewardType,
        amount: dayReward.amount
      } : null,
      nextHint: dayIndex < (activity.days || 7) ? `再簽到可領累積第${dayIndex + 1}天獎勵` : '已達最高累積天數獎勵',
    };
  }

  private simulateDailyCalendar(progress: CheckinProgress, todayDate: Date, activity: CheckinActivity) {
    const startDate = new Date(activity.startDate);
    const dayIndex = this.getDaysDifference(startDate, todayDate) + 1;

    if (dayIndex < 1 || dayIndex > (activity.days || 31)) {
      return {
        today: todayDate.toISOString().split('T')[0],
        checkedIn: false,
        message: '不在活動期間內',
      };
    }

    const claimed = progress.claimedDaysJson?.[dayIndex] || false;

    return {
      today: todayDate.toISOString().split('T')[0],
      checkedIn: !claimed,
      dayIndex,
      rewardAvailable: !claimed,
      message: claimed ? '今日已領取' : '可以領取今日獎勵',
    };
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    // 🔧 修復: 使用UTC時間避免時區問題
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    const diffTime = utc2 - utc1;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // 統一的日期字串處理方法
  private getDateString(date: Date): string {
    // 使用 UTC 時間確保全球一致性
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getNextThresholdHint(current: number, thresholds: any[]): string {
    const nextThreshold = thresholds.find(t => t.daysRequired > current);
    if (nextThreshold) {
      return `再簽到 ${nextThreshold.daysRequired - current} 天可獲得獎勵`;
    }
    return '已達所有門檻獎勵';
  }

  async getUserProgress(activityId: number, userId: number): Promise<CheckinProgress> {
    let progress = await this.progressRepository.findOne({
      where: { activityId, userId },
    });

    if (progress) {
      return progress;
    }
    
    // 如果沒有進度記錄，檢查是否有簽到記錄
    const ledgerRecords = await this.ledgerRepository.find({
      where: { activityId, userId },
      order: { issuedAt: 'ASC' }
    });

    let currentStreak = 0;
    let totalChecked = 0;
    let lastCheckinDate: string | undefined = undefined;
    const claimedDaysJson: any = {};

    if (ledgerRecords.length > 0) {
      // 從簽到記錄重建進度
      totalChecked = ledgerRecords.length;
      
      // 計算連續天數
      const today = this.getDateString(new Date());
      const sortedRecords = ledgerRecords.sort((a, b) => 
        new Date(a.metaJson?.checkinDate || a.issuedAt).getTime() - 
        new Date(b.metaJson?.checkinDate || b.issuedAt).getTime()
      );
      
      let streak = 0;
      let checkDate = today;
      
      // 從今天往回檢查連續簽到
      for (let i = sortedRecords.length - 1; i >= 0; i--) {
        const recordDate = sortedRecords[i].metaJson?.checkinDate || 
                          this.getDateString(new Date(sortedRecords[i].issuedAt));
        
        if (recordDate === checkDate) {
          streak++;
          
          if (sortedRecords[i].dayIndex) {
            claimedDaysJson[sortedRecords[i].dayIndex] = true;
          }
          
          // 往前一天
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          checkDate = this.getDateString(prevDate);
        } else {
          break;
        }
      }
      
      currentStreak = streak;
      lastCheckinDate = sortedRecords[sortedRecords.length - 1].metaJson?.checkinDate || 
                       this.getDateString(new Date(sortedRecords[sortedRecords.length - 1].issuedAt));
    }

    // 創建並保存進度記錄
    const newProgress = this.progressRepository.create({
      activityId,
      userId,
      currentStreak,
      totalChecked,
      lastCheckinDate,
      claimedDaysJson,
    });

    // 保存到資料庫
    await this.progressRepository.save(newProgress);

    return newProgress;
  }

  async performCheckin(activityId: number, userId: number, userInfo: any, clientIp: string) {
    const activity = await this.findActivityById(activityId);
    
    // 檢查活動是否啟用且在有效期間內
    const now = new Date();
    if (!activity.isEnabled) {
      throw new BadRequestException('活動未啟用');
    }
    
    if (new Date(activity.startDate) > now || new Date(activity.endDate) < now) {
      throw new BadRequestException('活動不在有效期間內');
    }

    // 使用事務確保併發安全
    const transactionResult = await this.progressRepository.manager.transaction(async transactionalEntityManager => {
      // 在事務中取得用戶進度，並加鎖防止併發
      let progress = await transactionalEntityManager.findOne(CheckinProgress, {
        where: { activityId, userId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!progress) {
        progress = transactionalEntityManager.create(CheckinProgress, {
          activityId,
          userId,
          currentStreak: 0,
          totalChecked: 0,
          claimedDaysJson: {},
        });
      }

      // 統一時區處理 - 使用UTC時間確保一致性
      const today = new Date();
      const todayStr = this.getDateString(today);
      const lastCheckinDate = progress.lastCheckinDate ? new Date(progress.lastCheckinDate + 'T00:00:00Z') : null;

      // 加強重複簽到檢查
      if (progress.lastCheckinDate === todayStr) {
        return {
          success: false,
          message: '今日已簽到',
          data: {
            currentStreak: progress.currentStreak,
            totalChecked: progress.totalChecked
          }
        };
      }

      // 根據活動類型執行簽到邏輯
      let result: any;
      switch (activity.activityType) {
        case ActivityType.STRICT_STREAK_7:
          result = await this.performStrictStreakCheckin(progress, today, lastCheckinDate, activity);
          break;
        case ActivityType.FLEX_CUMULATIVE:
          result = await this.performFlexCumulativeCheckin(progress, activity);
          break;
        case ActivityType.DAILY_CALENDAR:
          result = await this.performDailyCalendarCheckin(progress, today, activity);
          break;
        default:
          throw new BadRequestException('不支援的活動類型');
      }

      if (!result.success) {
        return result;
      }

      // 更新進度
      progress.lastCheckinDate = todayStr;
      if (result.currentStreak !== undefined) {
        progress.currentStreak = result.currentStreak;
      }
      if (result.totalChecked !== undefined) {
        progress.totalChecked = result.totalChecked;
      }
      if (result.dayIndex !== undefined) {
        progress.claimedDaysJson = {
          ...progress.claimedDaysJson,
          [result.dayIndex]: true
        };
      }

      await transactionalEntityManager.save(CheckinProgress, progress);

      // 記錄簽到日誌
      if (result.reward) {
        // 額外檢查是否已存在相同的簽到記錄，防止重複插入
        const existingLedger = await transactionalEntityManager.findOne(CheckinLedger, {
          where: {
            activityId,
            userId,
            dayIndex: result.dayIndex
          }
        });

        if (!existingLedger) {
          const ledger = transactionalEntityManager.create(CheckinLedger, {
            activityId,
            userId,
            rewardType: result.reward.rewardType,
            amount: result.reward.amount,
            dayIndex: result.dayIndex,
            tierDaysRequired: result.totalChecked,
            metaJson: {
              checkinDate: todayStr,
              activityTitle: activity.title
            }
          });
          await transactionalEntityManager.save(CheckinLedger, ledger);
        }
      }

      return {
        success: true,
        message: '簽到成功',
        data: {
          ...result,
          activityTitle: activity.title,
        }
      };
    }); // 結束事務

    // 事務外處理獎勵發放，避免長時間鎖定
    if (transactionResult.success && transactionResult.data) {
      const rewardInfo = transactionResult.data;
      
      if (rewardInfo.reward && rewardInfo.reward.rewardType === 'CASH' && rewardInfo.reward.amount > 0) {
        
        try {
          const balanceResult = await this.userService.updateBalanceForCheckin(
            userId,
            rewardInfo.reward.amount,
            `簽到獎勵：${activity.title} - 第${rewardInfo.dayIndex || rewardInfo.totalChecked}天`,
            userInfo,
            clientIp
          );
          
        } catch (error) {
          console.error('發放簽到獎勵失敗:', {
            error: error.message,
            userId,
            amount: rewardInfo.reward.amount,
            activityId
          });
          // 不影響簽到結果，但記錄失敗日誌供後續處理
        }
      }
    }

    return transactionResult;
  }

  private async performStrictStreakCheckin(progress: CheckinProgress, todayDate: Date, lastCheckinDate: Date | null, activity: CheckinActivity) {
    // 檢查今日是否已簽到
    const todayStr = todayDate.toISOString().split('T')[0];
    const lastCheckinStr = progress.lastCheckinDate;
    
    if (lastCheckinStr === todayStr) {
      return {
        success: false,
        message: '今日已簽到',
        currentStreak: progress.currentStreak
      };
    }

    let newStreak = progress.currentStreak;

    // 🔧 修復: 加強時間處理和邊界檢查
    if (!lastCheckinDate) {
      newStreak = 1; // 首次簽到
    } else {
      const dayDiff = this.getDaysDifference(lastCheckinDate, todayDate);
      
      if (dayDiff > 1) {
        newStreak = 1; // 中斷重新開始
      } else if (dayDiff === 1) {
        newStreak = progress.currentStreak + 1; // 連續簽到
      } else if (dayDiff === 0) {
        // 同一天重複簽到已在上面處理
        return {
          success: false,
          message: '今日已簽到',
          currentStreak: progress.currentStreak
        };
      } else {
        // dayDiff < 0 表示日期異常
        throw new BadRequestException('系統時間異常，請聯繫客服');
      }
    }

    // 🔧 修復: 活動天數驗證
    const maxDays = activity.days || 7;
    const dayIndex = Math.min(newStreak, maxDays);
    
    // 查找對應的日次獎勵
    const dayReward = await this.dayRewardRepository.findOne({
      where: { 
        activityId: activity.id, 
        dayIndex: dayIndex 
      }
    });
    
    const newTotalChecked = progress.totalChecked + 1;
    
    return {
      success: true,
      currentStreak: newStreak,
      totalChecked: newTotalChecked,
      dayIndex,
      reward: dayReward ? {
        rewardType: dayReward.rewardType,
        amount: dayReward.amount
      } : null,
      nextHint: dayIndex < maxDays ? `明日繼續簽到可領第${dayIndex + 1}天獎勵` : '已達最高連續天數獎勵',
    };
  }

  private async performFlexCumulativeCheckin(progress: CheckinProgress, activity: CheckinActivity) {
    // 檢查今日是否已簽到
    const todayStr = new Date().toISOString().split('T')[0];
    if (progress.lastCheckinDate === todayStr) {
      return {
        success: false,
        message: '今日已簽到',
        totalChecked: progress.totalChecked
      };
    }

    const newTotal = progress.totalChecked + 1;
    const maxDays = activity.days || 7;
    
    // 🔧 修復: 累積天數上限檢查
    if (newTotal > maxDays) {
      return {
        success: false,
        message: `已達累積簽到上限 ${maxDays} 天`,
        totalChecked: progress.totalChecked
      };
    }
    
    // 使用日次獎勵系統，根據累積天數找對應的獎勵
    const dayIndex = Math.min(newTotal, maxDays);
    
    // 查找對應的日次獎勵
    const dayReward = await this.dayRewardRepository.findOne({
      where: { 
        activityId: activity.id, 
        dayIndex: dayIndex 
      }
    });

    // 🔧 修復: 檢查是否有對應獎勵設定
    if (!dayReward) {
      console.warn(`累積簽到活動 ${activity.id} 累積第 ${dayIndex} 天沒有設定獎勵`);
    }

    // 🔧 修復: 累積簽到的連續天數等於總簽到天數
    const newCurrentStreak = newTotal;

    return {
      success: true,
      currentStreak: newCurrentStreak,
      totalChecked: newTotal,
      dayIndex,
      reward: dayReward ? {
        rewardType: dayReward.rewardType,
        amount: dayReward.amount
      } : null,
      nextHint: dayIndex < maxDays ? `再簽到可領累積第${dayIndex + 1}天獎勵` : '已達最高累積天數獎勵',
    };
  }

  private async performDailyCalendarCheckin(progress: CheckinProgress, todayDate: Date, activity: CheckinActivity) {
    const startDate = new Date(activity.startDate);
    const endDate = new Date(activity.endDate);
    
    // 🔧 修復: 檢查今天是否在活動期間內
    if (todayDate < startDate || todayDate > endDate) {
      return {
        success: false,
        message: '不在活動期間內'
      };
    }

    const dayIndex = this.getDaysDifference(startDate, todayDate) + 1;
    const maxDays = activity.days || 31;

    // 🔧 修復: 加強邊界檢查
    if (dayIndex < 1 || dayIndex > maxDays) {
      return {
        success: false,
        message: `活動僅進行${maxDays}天，今日超出範圍`
      };
    }

    // 🔧 修復: 檢查重複領取
    const claimed = progress.claimedDaysJson?.[dayIndex] || false;
    if (claimed) {
      return {
        success: false,
        message: '今日已領取',
        dayIndex
      };
    }

    // 查找對應的日次獎勵
    const dayReward = await this.dayRewardRepository.findOne({
      where: { 
        activityId: activity.id, 
        dayIndex: dayIndex 
      }
    });

    // 🔧 修復: 檢查是否有對應獎勵設定
    if (!dayReward) {
      console.warn(`每日簽到活動 ${activity.id} 第 ${dayIndex} 天沒有設定獎勵`);
    }

    // 🔧 修復: 每日簽到也需要計算總簽到次數和連續天數
    const newTotalChecked = progress.totalChecked + 1;
    
    // 對於每日簽到，連續天數可以是累積天數（也就是總簽到天數）
    const newCurrentStreak = newTotalChecked;

    return {
      success: true,
      currentStreak: newCurrentStreak,
      totalChecked: newTotalChecked,
      dayIndex,
      reward: dayReward ? {
        rewardType: dayReward.rewardType,
        amount: dayReward.amount
      } : null,
      message: '簽到成功',
      nextHint: dayIndex < maxDays ? `明日可領取第${dayIndex + 1}天獎勵` : '活動即將結束',
    };
  }

  async getCheckinStatus(activityId: number, userId: number) {
    const activity = await this.findActivityById(activityId);
    
    if (!activity.isEnabled) {
      throw new BadRequestException('活動未啟用');
    }

    const progress = await this.getUserProgress(activityId, userId);
    const today = this.getDateString(new Date());
    const todayChecked = progress.lastCheckinDate === today;

    // 獲取下一個可領獎勵
    let nextReward: any = null;
    if (!todayChecked) {
      switch (activity.activityType) {
        case ActivityType.STRICT_STREAK_7:
          const nextDay = progress.currentStreak + 1;
          const dayReward = await this.dayRewardRepository.findOne({
            where: { activityId, dayIndex: Math.min(nextDay, activity.days || 7) }
          });
          if (dayReward) {
            nextReward = {
              day_number: Math.min(nextDay, activity.days || 7),
              reward_type: dayReward.rewardType,
              reward_value: dayReward.amount,
              reward_description: `第${Math.min(nextDay, activity.days || 7)}天簽到獎勵`
            };
          }
          break;
        case ActivityType.FLEX_CUMULATIVE:
          const nextTotal = progress.totalChecked + 1;
          const nextDayIndex = Math.min(nextTotal, activity.days || 7);
          const nextDayReward = await this.dayRewardRepository.findOne({
            where: { activityId, dayIndex: nextDayIndex }
          });
          if (nextDayReward) {
            nextReward = {
              day_number: nextDayIndex,
              reward_type: nextDayReward.rewardType,
              reward_value: nextDayReward.amount,
              reward_description: `累積第${nextDayIndex}天獎勵`
            };
          }
          break;
      }
    }

    return {
      can_checkin: !todayChecked,
      consecutive_days: Number(progress.currentStreak) || 0,
      total_checkins: Number(progress.totalChecked) || 0,
      last_checkin_date: progress.lastCheckinDate ? new Date(progress.lastCheckinDate) : null,
      today_checked: todayChecked,
      next_reward: nextReward,
      activity_title: activity.title,
      activity_type: activity.activityType
    };
  }

  // 新增：根據公司ID查詢活動（用於前端API）
  async findActivitiesByCompany(companyId: number, isEnabled?: boolean) {
    const queryBuilder = this.activityRepository.createQueryBuilder('activity');
    
    queryBuilder.andWhere('activity.companyId = :companyId', { companyId });
    
    if (isEnabled !== undefined) {
      queryBuilder.andWhere('activity.isEnabled = :isEnabled', { isEnabled });
    }
    
    // 只返回在有效期間內的活動
    const now = new Date();
    queryBuilder.andWhere('activity.startDate <= :now', { now });
    queryBuilder.andWhere('activity.endDate >= :now', { now });
    
    queryBuilder.orderBy('activity.createdAt', 'DESC');
    
    const activities = await queryBuilder.getMany();
    
    return activities;
  }

  // 新增：合併的狀態和獎勵配置
  async getCheckinStatusWithRewards(activityId: number, userId: number) {
    const activity = await this.findActivityById(activityId);
    
    if (!activity.isEnabled) {
      throw new BadRequestException('活動未啟用');
    }

    const progress = await this.getUserProgress(activityId, userId);
    
    const today = this.getDateString(new Date());
    const todayChecked = progress.lastCheckinDate === today;

    // 獲取下一個可領獎勵
    let nextReward: any = null;
    if (!todayChecked) {
      switch (activity.activityType) {
        case ActivityType.STRICT_STREAK_7:
          const nextDay = progress.currentStreak + 1;
          const dayReward = await this.dayRewardRepository.findOne({
            where: { activityId, dayIndex: Math.min(nextDay, activity.days || 7) }
          });
          if (dayReward) {
            nextReward = {
              day_number: Math.min(nextDay, activity.days || 7),
              reward_type: dayReward.rewardType,
              reward_value: dayReward.amount,
              reward_description: `第${Math.min(nextDay, activity.days || 7)}天簽到獎勵`
            };
          }
          break;
        case ActivityType.FLEX_CUMULATIVE:
          const nextTotal = progress.totalChecked + 1;
          const nextDayIndex = Math.min(nextTotal, activity.days || 7);
          const nextDayReward = await this.dayRewardRepository.findOne({
            where: { activityId, dayIndex: nextDayIndex }
          });
          if (nextDayReward) {
            nextReward = {
              day_number: nextDayIndex,
              reward_type: nextDayReward.rewardType,
              reward_value: nextDayReward.amount,
              reward_description: `累積第${nextDayIndex}天獎勵`
            };
          }
          break;
      }
    }

    // 將獎勵配置轉換為前端期望的格式
    const checkinConfigs = activity.dayRewards?.map((reward: any) => ({
      day_number: reward.dayIndex,
      reward_type: reward.rewardType?.toLowerCase() || 'cash',
      reward_value: reward.amount,
      reward_description: `第${reward.dayIndex}天獎勵`,
      is_completed: progress.currentStreak >= reward.dayIndex || 
                   (progress.claimedDaysJson && progress.claimedDaysJson[reward.dayIndex])
    })) || [];

    return {
      can_checkin: !todayChecked,
      consecutive_days: Number(progress.currentStreak) || 0,
      total_checkins: Number(progress.totalChecked) || 0,
      last_checkin_date: progress.lastCheckinDate ? new Date(progress.lastCheckinDate) : null,
      today_checked: todayChecked,
      next_reward: nextReward,
      activity_title: activity.title,
      activity_type: activity.activityType,
      checkin_configs: checkinConfigs // 包含完整的獎勵配置
    };
  }
}