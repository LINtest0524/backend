import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LuckyDrawEvent } from "./lucky-draw-event.entity";

@Injectable()
export class LuckyDrawEventService {
  constructor(
    @InjectRepository(LuckyDrawEvent)
    private eventRepo: Repository<LuckyDrawEvent>,
  ) {}

  // 取得所有活動
  async findAll(companyId?: number) {
    const whereCondition = companyId ? { companyId } : {};
    return this.eventRepo.find({
      where: whereCondition,
      relations: ['prizes'],
      order: { createdAt: 'DESC' }
    });
  }

  // 取得單一活動
  async findOne(id: number) {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['prizes']
    });
    if (!event) {
      throw new NotFoundException(`活動 ID ${id} 不存在`);
    }
    return event;
  }

  // 創建活動
  async create(data: {
    name: string;
    startTime: Date;
    endTime: Date;
    isActive?: boolean;
    companyId: number;
  }) {
    // 檢查時間邏輯
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      throw new BadRequestException('開始時間必須早於結束時間');
    }

    // 如果設為啟用，先停用其他活動
    if (data.isActive) {
      await this.eventRepo.update(
        { companyId: data.companyId, isActive: true },
        { isActive: false }
      );
    }

    const event = this.eventRepo.create(data);
    return this.eventRepo.save(event);
  }

  // 更新活動
  async update(id: number, data: Partial<{
    name: string;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
  }>) {
    const event = await this.findOne(id);

    // 檢查時間邏輯
    if (data.startTime && data.endTime) {
      if (new Date(data.startTime) >= new Date(data.endTime)) {
        throw new BadRequestException('開始時間必須早於結束時間');
      }
    }

    // 如果設為啟用，先停用其他活動
    if (data.isActive) {
      await this.eventRepo.update(
        { companyId: event.companyId, isActive: true },
        { isActive: false }
      );
    }

    await this.eventRepo.update(id, data);
    return this.findOne(id);
  }

  // 刪除活動
  async remove(id: number) {
    const event = await this.findOne(id);
    
    // 檢查是否有關聯的獎品
    if (event.prizes && event.prizes.length > 0) {
      throw new BadRequestException('此活動還有關聯的獎品，無法刪除');
    }

    await this.eventRepo.remove(event);
    return { message: `活動 ${event.name} 已刪除` };
  }

  // 取得當前啟用的活動
  async getActiveEvent(companyId?: number) {
    const whereCondition: any = { isActive: true };
    if (companyId) {
      whereCondition.companyId = companyId;
    }

    return this.eventRepo.findOne({
      where: whereCondition,
      relations: ['prizes']
    });
  }

  // 切換活動啟用狀態
  async toggleActive(id: number) {
    const event = await this.findOne(id);
    
    if (!event.isActive) {
      // 啟用此活動，停用其他活動
      await this.eventRepo.update(
        { companyId: event.companyId, isActive: true },
        { isActive: false }
      );
      await this.eventRepo.update(id, { isActive: true });
    } else {
      // 停用此活動
      await this.eventRepo.update(id, { isActive: false });
    }

    return this.findOne(id);
  }
}