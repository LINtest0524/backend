import { Controller, Get, Post, Body } from "@nestjs/common";
import { LuckyPrizeService } from "./lucky-prize.service";

@Controller("lucky-prize")
export class LuckyPrizeController {
  constructor(private readonly service: LuckyPrizeService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body) {
    return this.service.create(body);
  }
}
