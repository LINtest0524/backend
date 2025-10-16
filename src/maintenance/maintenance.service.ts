import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maintenance } from './maintenance.entity';

export interface MaintenanceDto {
  isEnabled: boolean;
  title?: string;
  message?: string;
  estimatedEndTime?: Date;
  contactInfo?: string;
  backgroundColor?: string;
  textColor?: string;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance)
    private maintenanceRepository: Repository<Maintenance>,
  ) {}

  // 獲取公司的維護設定
  async getMaintenanceStatus(companyId: number): Promise<Maintenance | null> {
    return await this.maintenanceRepository.findOne({
      where: { companyId }
    });
  }

  // 更新維護設定
  async updateMaintenanceStatus(
    companyId: number, 
    data: MaintenanceDto,
    userId?: number
  ): Promise<Maintenance> {
    let maintenance = await this.maintenanceRepository.findOne({
      where: { companyId }
    });

    if (!maintenance) {
      // 創建新的維護設定
      maintenance = this.maintenanceRepository.create({
        companyId,
        ...data,
        createdBy: userId
      });
    } else {
      // 更新現有設定
      Object.assign(maintenance, data);
    }

    return await this.maintenanceRepository.save(maintenance);
  }

  // 檢查是否處於維護模式
  async isMaintenanceMode(companyId: number): Promise<boolean> {
    const maintenance = await this.getMaintenanceStatus(companyId);
    return maintenance?.isEnabled || false;
  }

  // 獲取維護資訊（給前台使用）
  async getMaintenanceInfo(companyId: number): Promise<any> {
    const maintenance = await this.getMaintenanceStatus(companyId);
    
    if (!maintenance || !maintenance.isEnabled) {
      return { isEnabled: false };
    }

    return {
      isEnabled: true,
      title: maintenance.title,
      message: maintenance.message,
      estimatedEndTime: maintenance.estimatedEndTime,
      contactInfo: maintenance.contactInfo,
      backgroundColor: maintenance.backgroundColor,
      textColor: maintenance.textColor
    };
  }

  // 快速切換維護模式
  async toggleMaintenance(companyId: number, userId?: number): Promise<Maintenance> {
    const maintenance = await this.getMaintenanceStatus(companyId);
    const newStatus = !maintenance?.isEnabled;

    return await this.updateMaintenanceStatus(
      companyId,
      { isEnabled: newStatus },
      userId
    );
  }
}