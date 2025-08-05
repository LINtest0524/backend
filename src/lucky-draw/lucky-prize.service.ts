import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LuckyPrize } from "./lucky-prize.entity";

@Injectable()
export class LuckyPrizeService {
  constructor(
    @InjectRepository(LuckyPrize)
    private repo: Repository<LuckyPrize>,
  ) {}

  findAll() {
    return this.repo.find();
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
    const prize = await this.findOne(id);
    Object.assign(prize, data);
    return this.repo.save(prize);
  }

  async remove(id: number) {
    const prize = await this.findOne(id);
    await this.repo.remove(prize);
    return { message: `獎品 ${prize.name} 已刪除` };
  }
}
