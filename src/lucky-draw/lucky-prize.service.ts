import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LuckyPrize } from "./lucky-prize.entity";
import { LuckyDrawRecord } from "./lucky-draw-record.entity";
import { LuckyDrawEvent } from "./lucky-draw-event.entity";
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Injectable()
export class LuckyPrizeService {
  constructor(
    @InjectRepository(LuckyPrize)
    private repo: Repository<LuckyPrize>,
    @InjectRepository(LuckyDrawRecord)
    private recordRepo: Repository<LuckyDrawRecord>,
    @InjectRepository(LuckyDrawEvent)
    private eventRepo: Repository<LuckyDrawEvent>,
  ) {}

  findAll(eventId?: number) {
    if (eventId) {
      // 查詢特定活動的獎品
      return this.repo.find({
        where: { eventId },
        relations: ['event'],
        order: { id: 'ASC' }
      });
    } else {
      // 查詢所有獎品
      return this.repo.find({
        relations: ['event'],
        order: { id: 'ASC' }
      });
    }
  }

  // 取得當前啟用活動的獎品
  async findByActiveEvent(companyId?: number) {
    const activeEvent = await this.eventRepo.findOne({
      where: { isActive: true, ...(companyId && { companyId }) }
    });

    if (!activeEvent) {
      return [];
    }

    return this.repo.find({
      where: { eventId: activeEvent.id },
      relations: ['event'],
      order: { id: 'ASC' }
    });
  }

  async findOne(id: number) {
    const prize = await this.repo.findOne({ where: { id } });
    if (!prize) {
      throw new NotFoundException(`獎品 ID ${id} 不存在`);
    }
    return prize;
  }

  create(data) {
    const prize = this.repo.create(data);
    return this.repo.save(prize);
  }

  async update(id: number, data) {
    // 使用 update 而不是 save，避免影響排序
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    const prize = await this.findOne(id);
    await this.repo.remove(prize);
    return { message: `獎品 ${prize.name} 已刪除` };
  }

  async drawPrize(userId?: number, companyId?: number, userIp?: string, userAgent?: string) {
    console.log('=== 抽獎服務調試 ===');
    console.log('userId:', userId);
    console.log('companyId:', companyId);
    console.log('userIp:', userIp);
    
    // 檢查用戶是否存在
    if (!userId) {
      throw new BadRequestException('用戶ID不能為空');
    }

    // 取得當前啟用活動的獎品
    const whereCondition: any = { isActive: true };
    if (companyId) {
      whereCondition.companyId = companyId;
    }
    
    console.log('查詢活動條件:', whereCondition);
    
    const activeEvent = await this.eventRepo.findOne({
      where: whereCondition
    });

    console.log('找到的啟用活動:', activeEvent);

    if (!activeEvent) {
      throw new NotFoundException('目前沒有進行中的抽獎活動');
    }

    // 檢查活動時間
    const now = new Date();
    if (now < activeEvent.startTime || now > activeEvent.endTime) {
      throw new BadRequestException('抽獎活動尚未開始或已結束');
    }

    // 取得活動的獎品（按ID排序確保輪盤位置固定）
    const prizes = await this.repo.find({ 
      where: { eventId: activeEvent.id },
      order: { id: 'ASC' } // 按ID排序，確保輪盤位置永遠固定
    });

    if (prizes.length === 0) {
      throw new NotFoundException('沒有可用的獎品');
    }

    // 過濾掉庫存為0的獎品
    const availablePrizes = prizes.filter(prize => prize.quantity > 0);
    
    if (availablePrizes.length === 0) {
      throw new BadRequestException('所有獎品已售完');
    }

    // 根據機率計算中獎
    const totalProbability = availablePrizes.reduce((sum, prize) => sum + Number(prize.probability), 0);
    const random = Math.random() * totalProbability;
    
    let currentProbability = 0;
    let winningPrize = availablePrizes[0]; // 預設第一個獎品
    
    for (const prize of availablePrizes) {
      currentProbability += Number(prize.probability);
      if (random <= currentProbability) {
        winningPrize = prize;
        break;
      }
    }

    // 檢查獎品庫存
    if (winningPrize.quantity <= 0) {
      throw new BadRequestException(`獎品 ${winningPrize.name} 已售完`);
    }

    // 扣減獎品庫存
    await this.repo.update(winningPrize.id, {
      quantity: winningPrize.quantity - 1
    });

    // 記錄抽獎歷史
    const drawRecord = this.recordRepo.create({
      userId,
      prizeId: winningPrize.id,
      companyId: companyId || 1,
      userIp,
      userAgent,
      prizeName: winningPrize.name, // 記錄獎品名稱
      eventId: activeEvent.id, // 記錄活動ID
    });
    
    console.log('準備記錄抽獎:', drawRecord);
    
    const savedRecord = await this.recordRepo.save(drawRecord);
    
    console.log('已保存抽獎記錄:', savedRecord);

    // 計算中獎獎品在輪盤上的位置索引（使用原始獎品列表）
    const winningIndex = prizes.findIndex(p => p.id === winningPrize.id);
    
    return {
      success: true,
      winningPrize,
      winningIndex,
      totalPrizes: prizes.length,
      message: `恭喜您獲得：${winningPrize.name}！`,
      recordId: drawRecord.id
    };
  }

  // 取得用戶抽獎歷史
  async getUserDrawHistory(userId: number, companyId?: number) {
    const whereCondition: any = { userId };
    if (companyId) {
      whereCondition.companyId = companyId;
    }

    return this.recordRepo.find({
      where: whereCondition,
      relations: ['prize', 'user'],
      order: { createdAt: 'DESC' }
    });
  }

  // 取得所有抽獎記錄（管理員用）
  async getAllDrawRecords(params: {
    companyId?: number;
    eventId?: number;
    username?: string;
    prizeName?: string;
    createdFrom?: string;
    createdTo?: string;
    limit: number;
    page: number;
  }) {
    const { companyId, eventId, username, prizeName, createdFrom, createdTo, limit, page } = params;
    
    const queryBuilder = this.recordRepo.createQueryBuilder('record')
      .leftJoinAndSelect('record.prize', 'prize')
      .leftJoinAndSelect('record.event', 'event')
      .leftJoinAndSelect('record.user', 'user');

    // 基本條件
    if (companyId) {
      queryBuilder.andWhere('record.companyId = :companyId', { companyId });
    }

    if (eventId) {
      queryBuilder.andWhere('record.eventId = :eventId', { eventId });
    }

    if (username) {
      queryBuilder.andWhere('user.username LIKE :username', { username: `%${username}%` });
    }

    if (prizeName) {
      queryBuilder.andWhere('(record.prizeName LIKE :prizeName OR prize.name LIKE :prizeName)', { 
        prizeName: `%${prizeName}%` 
      });
    }

    if (createdFrom) {
      queryBuilder.andWhere('record.createdAt >= :createdFrom', { createdFrom });
    }

    if (createdTo) {
      queryBuilder.andWhere('record.createdAt <= :createdTo', { createdTo });
    }

    // 排序
    queryBuilder.orderBy('record.createdAt', 'DESC');

    // 分頁
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // 執行查詢
    const [data, totalCount] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      totalCount,
      totalPages,
      currentPage: page,
      limit
    };
  }

  // 匯出抽獎記錄
  async exportDrawRecords(params: {
    companyId?: number;
    eventId?: number;
    username?: string;
    prizeName?: string;
    createdFrom?: string;
    createdTo?: string;
    format: 'csv' | 'xlsx';
  }, res: any): Promise<void> {
    const { companyId, eventId, username, prizeName, createdFrom, createdTo, format } = params;
    
    const queryBuilder = this.recordRepo.createQueryBuilder('record')
      .leftJoinAndSelect('record.prize', 'prize')
      .leftJoinAndSelect('record.event', 'event')
      .leftJoinAndSelect('record.user', 'user');

    // 基本條件
    if (companyId) {
      queryBuilder.andWhere('record.companyId = :companyId', { companyId });
    }

    if (eventId) {
      queryBuilder.andWhere('record.eventId = :eventId', { eventId });
    }

    if (username) {
      queryBuilder.andWhere('user.username LIKE :username', { username: `%${username}%` });
    }

    if (prizeName) {
      queryBuilder.andWhere('(record.prizeName LIKE :prizeName OR prize.name LIKE :prizeName)', { 
        prizeName: `%${prizeName}%` 
      });
    }

    if (createdFrom) {
      queryBuilder.andWhere('record.createdAt >= :createdFrom', { createdFrom });
    }

    if (createdTo) {
      queryBuilder.andWhere('record.createdAt <= :createdTo', { createdTo });
    }

    // 排序
    queryBuilder.orderBy('record.createdAt', 'DESC');

    // 取得所有資料（不分頁）
    const records = await queryBuilder.getMany();

    // 準備匯出資料
    const exportData = records.map(record => ({
      '記錄ID': record.id,
      '用戶帳號': record.user?.username || '未知用戶',
      '活動名稱': record.event?.name || record.prize?.event?.name || '未知活動',
      '獎品名稱': record.prizeName || record.prize?.name || '',
      '中獎機率': record.prize?.probability ? `${record.prize.probability}%` : '',
      '抽獎時間': new Date(record.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      '用戶IP': record.userIp || '',
      '裝置資訊': this.getDeviceInfo(record.userAgent || ''),
      '公司ID': record.companyId
    }));

    if (format === 'csv') {
      this.exportToCsv(exportData, res);
    } else if (format === 'xlsx') {
      await this.exportToExcel(exportData, res);
    } else {
      throw new BadRequestException('不支援的匯出格式');
    }
  }

  private getDeviceInfo(userAgent: string): string {
    if (!userAgent) return "未知裝置";
    
    if (userAgent.includes("Mobile")) return "手機";
    if (userAgent.includes("Tablet")) return "平板";
    return "電腦";
  }

  private exportToCsv(data: any[], res: any): void {
    if (data.length === 0) {
      throw new BadRequestException('沒有資料可匯出');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const filename = `抽獎記錄_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.write('\uFEFF'); // BOM for UTF-8
    res.end(csvContent);
  }

  private async exportToExcel(data: any[], res: any): Promise<void> {
    if (data.length === 0) {
      throw new BadRequestException('沒有資料可匯出');
    }

    const firstRow = data[0];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('抽獎記錄');

    // 設定欄位
    sheet.columns = Object.keys(firstRow).map((key) => ({
      header: key,
      key,
      width: 20,
    }));

    // 確保資料一致：即便其他筆缺少欄位也補空字串
    const normalizedRows = data.map((row) => {
      const filled: Record<string, string> = {};
      for (const key of Object.keys(firstRow)) {
        filled[key] = row[key] ?? '';
      }
      return filled;
    });

    // 添加資料
    if (normalizedRows.length === 1) {
      sheet.addRow(normalizedRows[0]);
    } else {
      sheet.addRows(normalizedRows);
    }

    const filename = `抽獎記錄_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    await workbook.xlsx.write(res);
    res.end();
  }
}
