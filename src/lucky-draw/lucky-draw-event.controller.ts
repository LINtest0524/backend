import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from "@nestjs/common";
import { Request } from 'express';
import { LuckyDrawEventService } from "./lucky-draw-event.service";
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller("lucky-draw-events")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
export class LuckyDrawEventController {
  constructor(private readonly eventService: LuckyDrawEventService) {}

  @Get()
  findAll(@Query('companyId') companyId?: number) {
    return this.eventService.findAll(companyId);
  }

  @Get('active')
  getActiveEvent(@Query('companyId') companyId?: number) {
    return this.eventService.getActiveEvent(companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    name: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
    companyId: number;
  }, @Req() req: Request) {
    const user = req.user as any;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能在自己的公司創建抽獎活動
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
      if (body.companyId !== userCompanyId) {
        throw new Error('無權限在此公司創建抽獎活動');
      }
    }
    
    return this.eventService.create({
      ...body,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      companyId: userCompanyId, // 強制使用用戶的公司ID
    });
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      startTime?: string;
      endTime?: string;
      isActive?: boolean;
    },
    @Req() req: Request
  ) {
    const user = req.user as any;
    const userCompanyId = user.companyId || user.company_id;
    
    const updateData: any = { ...body };
    if (body.startTime) updateData.startTime = new Date(body.startTime);
    if (body.endTime) updateData.endTime = new Date(body.endTime);
    
    // 權限檢查：代理商只能修改自己公司的抽獎活動
    // TODO: 在 service 層檢查活動是否屬於用戶的公司
    return this.eventService.update(id, updateData);
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能切換自己公司的抽獎活動
    // TODO: 在 service 層檢查活動是否屬於用戶的公司
    return this.eventService.toggleActive(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    const userCompanyId = user.companyId || user.company_id;
    
    // 權限檢查：代理商只能刪除自己公司的抽獎活動
    // TODO: 在 service 層檢查活動是否屬於用戶的公司
    return this.eventService.remove(id);
  }
}