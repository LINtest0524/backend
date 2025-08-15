// src/identity-verification/identity-verification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IdentityVerification } from './identity-verification.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
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
    status: 'APPROVED' | 'REJECTED',
    note?: string,
  ) {
    const verification = await this.identityRepo.findOne({ where: { id } });
    if (!verification) throw new NotFoundException('not found驗證紀錄');

    verification.status = status;
    verification.note = note || null;

    return this.identityRepo.save(verification);
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
