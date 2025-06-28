// src/identity-verification/identity-verification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IdentityVerification } from './identity-verification.entity';
import { Repository } from 'typeorm';
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
  ) {}

  async saveVerificationFiles(
    userId: number,
    files: Express.Multer.File[],
    type: 'ID_CARD' | 'BANK_ACCOUNT',
  ) {
    const uploadDir = path.join(__dirname, '../../public/uploads/identity');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filenames: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const cleanName = `${uuidv4()}${ext}`;
      const filepath = path.join(uploadDir, cleanName);
      await fs.promises.writeFile(filepath, file.buffer);
      filenames.push(cleanName);
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
    return this.identityRepo.save(record);
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
    if (!verification) throw new NotFoundException('找不到驗證紀錄');

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
}
