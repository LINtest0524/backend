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

  async saveVerificationFiles(userId: number, files: Express.Multer.File[]) {
    const uploadDir = path.join(__dirname, '../../public/uploads/identity');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filenames: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const cleanName = `${uuidv4()}${ext}`;
      const filepath = path.join(uploadDir, cleanName);

      console.log('📂 儲存檔案:', cleanName);
      await fs.promises.writeFile(filepath, file.buffer);
      filenames.push(cleanName);
    }

    const [front, back, selfie] = filenames;

    const record: Partial<IdentityVerification> = this.identityRepo.create({
      userId,
      frontImage: front,
      backImage: back,
      selfieImage: selfie,
      status: 'PENDING',
    });

    return this.identityRepo.save(record);
  }

  async findByUserId(userId: number) {
    return await this.identityRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteVerificationByUserId(userId: number) {
    return await this.identityRepo.delete({ userId });
  }

  // ✅ 新增：後台查全部資料
  async findAllForAdmin() {
    const records = await this.identityRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return records.map((rec) => ({
      id: rec.id,
      username: rec.user?.username ?? '(無)',
      type: 'ID_CARD', // 可依需求再分銀行帳戶等
      createdAt: rec.createdAt,
      status: rec.status,
      images: [
        `${process.env.API_BASE_URL}/uploads/identity/${rec.frontImage}`,
        `${process.env.API_BASE_URL}/uploads/identity/${rec.backImage}`,
        `${process.env.API_BASE_URL}/uploads/identity/${rec.selfieImage}`,
      ],
      note: rec.note,
    }));
  }

  // ✅ 新增：審核身分驗證
  async review(
    id: number,
    reviewedBy: number,
    status: 'APPROVED' | 'REJECTED',
    note?: string,
  ) {
    const verification = await this.identityRepo.findOne({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException('找不到驗證紀錄');
    }

    verification.status = status;
    verification.note = note || null;

    return this.identityRepo.save(verification);
  }



  async findAllForCompany(companyId: number) {
    const records = await this.identityRepo.find({
      where: {
        user: { company: { id: companyId } },
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return records.map((rec) => ({
      id: rec.id,
      username: rec.user?.username ?? '（無）',
      type: 'ID_CARD',
      createdAt: rec.createdAt,
      status: rec.status,
      images: [
        `${process.env.API_BASE_URL}/uploads/identity/${rec.frontImage}`,
        `${process.env.API_BASE_URL}/uploads/identity/${rec.backImage}`,
        `${process.env.API_BASE_URL}/uploads/identity/${rec.selfieImage}`,
      ],
      note: rec.note,
    }));
  }

}
