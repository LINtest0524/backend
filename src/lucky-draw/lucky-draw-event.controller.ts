import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe } from "@nestjs/common";
import { LuckyDrawEventService } from "./lucky-draw-event.service";

@Controller("lucky-draw-events")
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
  }) {
    return this.eventService.create({
      ...body,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
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
    }
  ) {
    const updateData: any = { ...body };
    if (body.startTime) updateData.startTime = new Date(body.startTime);
    if (body.endTime) updateData.endTime = new Date(body.endTime);
    
    return this.eventService.update(id, updateData);
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.toggleActive(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.remove(id);
  }
}