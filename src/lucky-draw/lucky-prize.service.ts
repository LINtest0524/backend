import { Injectable } from "@nestjs/common";
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

  create(data) {
    const prize = this.repo.create(data);
    return this.repo.save(prize);
  }
}
