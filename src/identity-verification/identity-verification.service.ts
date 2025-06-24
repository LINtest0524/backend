import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IdentityVerification } from './identity-verification.entity';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';

@Injectable()
export class IdentityVerificationService {
  constructor(
    @InjectRepository(IdentityVerification)
    private readonly identityRepo: Repository<IdentityVerification>,
  ) {}

  async saveVerificationFiles(userId: number, files: Express.Multer.File[]) {
    const uploadDir = path.join(__dirname, '../../public/uploads/identity');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filenames: string[] = [];

    for (const file of files) {
      const filename = `${uuidv4()}-${file.originalname}`;
      const filepath = path.join(uploadDir, filename);

      console.log('📂 儲存檔案:', filename);

      await fs.promises.writeFile(filepath, file.buffer);
      filenames.push(filename);
    }

    const [front, back, selfie] = filenames;

    const record: Partial<IdentityVerification> = this.identityRepo.create({
  userId,
  frontImage: front,
  backImage: back,
  selfieImage: selfie,
  status: 'PENDING', // ✅ 要用大寫，符合 enum
});

    return this.identityRepo.save(record);
  }
}
