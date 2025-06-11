import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blacklist } from './blacklist.entity';
import { User } from '../user/user.entity';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';

@Injectable()
export class BlacklistService {
  constructor(
    @InjectRepository(Blacklist)
    private readonly blacklistRepo: Repository<Blacklist>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateBlacklistDto): Promise<Blacklist> {
    const { userId, email, ip, reason } = dto;

    if (!userId && !email && !ip) {
      throw new BadRequestException('請提供 userId、email 或 ip 任一項作為封鎖依據');
    }

    // 若傳入 userId，則更新 user.is_blacklisted = true
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('使用者不存在');

      user.is_blacklisted = true;
      await this.userRepo.save(user);
    }

    // 建立封鎖紀錄
    const record = this.blacklistRepo.create({
      userId,
      email,
      ip,
      reason,
    });

    return await this.blacklistRepo.save(record);
  }

  async findAll(): Promise<Blacklist[]> {
    return this.blacklistRepo.find();
  }

  async remove(id: number): Promise<{ message: string }> {
    const record = await this.blacklistRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('黑名單紀錄不存在');

    // 若該紀錄關聯 userId，自動取消封鎖
    if (record.userId) {
      const user = await this.userRepo.findOne({ where: { id: record.userId } });
      if (user) {
        user.is_blacklisted = false;
        await this.userRepo.save(user);
      }
    }

    await this.blacklistRepo.delete(id);
    return { message: '已解除封鎖' };
  }
}
