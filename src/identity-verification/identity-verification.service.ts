// src/identity-verification/identity-verification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IdentityVerification } from './identity-verification.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { AutoTagRuleService } from '../auto-tag-rule/auto-tag-rule.service';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import { User } from '../user/user.entity';

@Injectable()
export class IdentityVerificationService {
  constructor(
    @InjectRepository(IdentityVerification)
    private readonly identityRepo: Repository<IdentityVerification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly autoTagRuleService: AutoTagRuleService,
  ) {}

  async saveVerificationFiles(
    userId: number,
    files: Express.Multer.File[],
    type: 'ID_CARD' | 'BANK_ACCOUNT',
  ) {
    console.log(` 開始處理驗證文件 - 用戶ID: ${userId}, 類型: ${type}, 文件數量: ${files.length}`);
    
    // 檢查是否已有相同類型的驗證記錄，如果有則先刪除
    const existingRecord = await this.findByUserId(userId, type);
    if (existingRecord) {
      console.log(`   發現現有記錄，將先刪除 - 記錄ID: ${existingRecord.id}`);
      // 先刪除舊的圖檔
      await this.deleteVerificationFiles(existingRecord);
      // 再刪除資料庫記錄
      await this.identityRepo.remove(existingRecord);
    }

    const uploadDir = path.join(__dirname, '../../public/uploads/identity');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filenames: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const cleanName = `${uuidv4()}${ext}`;
      const filepath = path.join(uploadDir, cleanName);
      await fs.promises.writeFile(filepath, file.buffer);
      filenames.push(cleanName);
      console.log(` 文件已保存: ${cleanName}`);
    }

    let recordData: Partial<IdentityVerification> = {
      userId,
      type,
      status: 'PENDING',
    };

    if (type === 'ID_CARD') {
      if (filenames.length !== 3) throw new Error('身分證驗證需上傳三張圖片');
      const [front, back, selfie] = filenames;
      recordData = { ...recordData, frontImage: front, backImage: back, selfieImage: selfie };
    } else if (type === 'BANK_ACCOUNT') {
      if (filenames.length !== 1) throw new Error('銀行帳戶驗證需上傳一張圖片');
      const [accountImage] = filenames;
      recordData = { ...recordData, accountImage };
    }

    const record = this.identityRepo.create(recordData);
    const savedRecord = await this.identityRepo.save(record);
    console.log(`  驗證記錄已保存 - 記錄ID: ${savedRecord.id}`);
    
    // 獲取用戶信息並發送通知
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ['company']
    });
    
    if (user) {
      const verificationWithUser = {
        ...savedRecord,
        user
      };
      
      // 發送即時通知
      await this.notificationService.sendVerificationNotification(verificationWithUser);
    }
    
    return savedRecord;
  }

  async findByUserId(userId: number, type: 'ID_CARD' | 'BANK_ACCOUNT') {
    return await this.identityRepo.findOne({
      where: { userId, type },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserVerification(userId: number, type: 'ID_CARD' | 'BANK_ACCOUNT') {
    const record = await this.findByUserId(userId, type);
    if (!record) return null;

    const images =
      type === 'ID_CARD'
        ? [
            `${process.env.API_BASE_URL}/uploads/identity/${record.frontImage}`,
            `${process.env.API_BASE_URL}/uploads/identity/${record.backImage}`,
            `${process.env.API_BASE_URL}/uploads/identity/${record.selfieImage}`,
          ]
        : [`${process.env.API_BASE_URL}/uploads/identity/${record.accountImage}`];

    return {
  id: record.id,
  type: record.type,
  status: record.status,
  note: record.note,
  images:
    record.type === 'ID_CARD'
      ? [
          `${process.env.API_BASE_URL}/uploads/identity/${record.frontImage}`,
          `${process.env.API_BASE_URL}/uploads/identity/${record.backImage}`,
          `${process.env.API_BASE_URL}/uploads/identity/${record.selfieImage}`,
        ]
      : [
          `${process.env.API_BASE_URL}/uploads/identity/${record.accountImage}`,
        ],
  createdAt: record.createdAt,
};

  }

  async deleteVerificationByUserId(userId: number, type: 'ID_CARD' | 'BANK_ACCOUNT') {
    return await this.identityRepo.delete({ userId, type });
  }

  // 刪除驗證記錄相關的圖檔
  private async deleteVerificationFiles(verification: IdentityVerification) {
    const uploadDir = path.join(__dirname, '../../public/uploads/identity');
    const filesToDelete: string[] = [];

    if (verification.type === 'ID_CARD') {
      if (verification.frontImage) filesToDelete.push(verification.frontImage);
      if (verification.backImage) filesToDelete.push(verification.backImage);
      if (verification.selfieImage) filesToDelete.push(verification.selfieImage);
    } else if (verification.type === 'BANK_ACCOUNT') {
      if (verification.accountImage) filesToDelete.push(verification.accountImage);
    }

    for (const filename of filesToDelete) {
      try {
        const filepath = path.join(uploadDir, filename);
        if (fs.existsSync(filepath)) {
          await fs.promises.unlink(filepath);
          console.log(`🗑️ 已刪除圖檔: ${filename}`);
        }
      } catch (error) {
        console.error(`⚠️ 刪除圖檔失敗 ${filename}:`, error);
      }
    }
  }


  async findAllForAdmin() {
    const records = await this.identityRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return records.map((rec) => ({
      id: rec.id,
      username: rec.user?.username ?? '(無)',
      type: rec.type,
      createdAt: rec.createdAt,
      status: rec.status,
      images:
        rec.type === 'ID_CARD'
          ? [
              `${process.env.API_BASE_URL}/uploads/identity/${rec.frontImage}`,
              `${process.env.API_BASE_URL}/uploads/identity/${rec.backImage}`,
              `${process.env.API_BASE_URL}/uploads/identity/${rec.selfieImage}`,
            ]
          : [`${process.env.API_BASE_URL}/uploads/identity/${rec.accountImage}`],
      note: rec.note,
    }));
  }

  async review(
    id: number,
    reviewedBy: number,
    status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED',
    note?: string,
  ) {
    const verification = await this.identityRepo.findOne({ 
      where: { id },
      relations: ['user']
    });
    if (!verification) throw new NotFoundException('not found驗證紀錄');

    // 如果狀態設為 REJECTED，先刪除相關圖檔
    if (status === 'REJECTED') {
      console.log(`📋 驗證申請被拒絕，將刪除相關圖檔 - 記錄ID: ${id}`);
      await this.deleteVerificationFiles(verification);
    }

    verification.status = status;
    verification.note = note || null;

    // 關鍵修復：當狀態變為 APPROVED 時，更新 user 表的對應欄位
    if (status === 'APPROVED' && verification.user) {
      const user = verification.user;
      
      if (verification.type === 'ID_CARD') {
        user.id_verified = true;
        user.id_verified_at = new Date();
        console.log(`✅ 身分證驗證通過 - 用戶: ${user.username}`);
      } else if (verification.type === 'BANK_ACCOUNT') {
        user.bank_verified = true;
        user.bank_verified_at = new Date();
        console.log(`✅ 銀行驗證通過 - 用戶: ${user.username}`);
      }
      
      // 保存用戶資料
      await this.userRepo.save(user);
      
      // 觸發自動標籤檢查
      try {
        const changedFields = verification.type === 'ID_CARD' ? ['id_verified'] : ['bank_verified'];
        await this.autoTagRuleService.applyAutoTags(user, changedFields);
        console.log(`🏷️ 已為用戶 ${user.username} 應用自動標籤`);
      } catch (error) {
        console.error('觸發自動標籤檢查失敗:', error);
      }
    }

    // 當狀態變為 REJECTED 時，移除對應的驗證狀態
    if (status === 'REJECTED' && verification.user) {
      const user = verification.user;
      
      if (verification.type === 'ID_CARD') {
        user.id_verified = false;
        user.id_verified_at = null;
        console.log(`❌ 身分證驗證被拒絕 - 用戶: ${user.username}`);
      } else if (verification.type === 'BANK_ACCOUNT') {
        user.bank_verified = false;
        user.bank_verified_at = null;
        console.log(`❌ 銀行驗證被拒絕 - 用戶: ${user.username}`);
      }
      
      // 保存用戶資料
      await this.userRepo.save(user);
      
      // 觸發自動標籤移除
      try {
        const changedFields = verification.type === 'ID_CARD' ? ['id_verified'] : ['bank_verified'];
        await this.autoTagRuleService.applyAutoTags(user, changedFields);
        console.log(`🏷️ 已為用戶 ${user.username} 移除對應的自動標籤`);
      } catch (error) {
        console.error('移除自動標籤失敗:', error);
      }
    }

    const savedVerification = await this.identityRepo.save(verification);
    console.log(`📋 驗證狀態已更新 - ID: ${id}, 狀態: ${status}`);
    
    return savedVerification;
  }

  async findAllForCompany(companyId: number) {
    const records = await this.identityRepo.find({
      where: { user: { company: { id: companyId } } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return records.map((rec) => ({
      id: rec.id,
      username: rec.user?.username ?? '(無)',
      type: rec.type,
      createdAt: rec.createdAt,
      status: rec.status,
      images:
        rec.type === 'ID_CARD'
          ? [
              `${process.env.API_BASE_URL}/uploads/identity/${rec.frontImage}`,
              `${process.env.API_BASE_URL}/uploads/identity/${rec.backImage}`,
              `${process.env.API_BASE_URL}/uploads/identity/${rec.selfieImage}`,
            ]
          : [`${process.env.API_BASE_URL}/uploads/identity/${rec.accountImage}`],
      note: rec.note,
    }));
  }




  async findAllPaginated(
    companyId: number,
    page = 1,
    limit = 20,
    filters?: {
      username?: string
      type?: string
      status?: string
      createdFrom?: string
      createdTo?: string
    },
    currentUser?: { role: string } // 傳入目前登入者的角色
  ) {
    const qb = this.identityRepo
      .createQueryBuilder('verification')
      .leftJoinAndSelect('verification.user', 'user');

    const isGlobalAdmin = currentUser && ['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(currentUser.role);

    if (!isGlobalAdmin) {
      qb.where('user.company_id = :companyId', { companyId });
    } else {
      qb.where('1 = 1'); // 確保 where 開頭可用 andWhere 銜接
    }

    if (filters?.username) {
      qb.andWhere('user.username ILIKE :username', {
        username: `%${filters.username}%`,
      });
    }

    if (filters?.type) {
      qb.andWhere('verification.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      qb.andWhere('verification.status = :status', { status: filters.status });
    }

    if (filters?.createdFrom) {
      qb.andWhere('verification.createdAt >= :createdFrom', {
        createdFrom: filters.createdFrom,
      });
    }

    if (filters?.createdTo) {
      qb.andWhere('verification.createdAt <= :createdTo', {
        createdTo: filters.createdTo,
      });
    }

    qb.orderBy('verification.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [records, total] = await qb.getManyAndCount();

    const result = records.map((rec) => ({
      id: rec.id,
      username: rec.user?.username ?? '(無)',
      type: rec.type,
      createdAt: rec.createdAt,
      status: rec.status,
      images:
        rec.type === 'ID_CARD'
          ? [
              `${process.env.API_BASE_URL}/uploads/identity/${rec.frontImage}`,
              `${process.env.API_BASE_URL}/uploads/identity/${rec.backImage}`,
              `${process.env.API_BASE_URL}/uploads/identity/${rec.selfieImage}`,
            ]
          : [
              `${process.env.API_BASE_URL}/uploads/identity/${rec.accountImage}`,
            ],
      note: rec.note,
    }));

    return {
      data: result,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
    };
  }






}
