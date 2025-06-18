import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common'
import { MarqueeService } from './marquee.service'

@Controller()
export class MarqueeController {
  constructor(private readonly marqueeService: MarqueeService) {}

  // ✅ 前台 API（新增）
  @Get('portal/marquee')
  getForPortal(@Query('company') company: string) {
    return this.marqueeService.findByCompanyCode(company)
  }

  // ✅ 後台 API
  @Get('admin/marquee/:companyId')
  getAll(@Param('companyId') companyId: number) {
    return this.marqueeService.findAll(companyId)
  }

  @Get('admin/marquee/item/:id')
  getOne(@Param('id') id: number) {
    return this.marqueeService.findOne(id)
  }

  @Post('admin/marquee')
  create(@Body() body: any) {
    return this.marqueeService.create(body, { id: body.companyId } as any)
  }

  @Put('admin/marquee/:id')
  update(@Param('id') id: number, @Body() body: any) {
    return this.marqueeService.update(id, body)
  }

  @Delete('admin/marquee/:id')
  delete(@Param('id') id: number) {
    return this.marqueeService.remove(id)
  }
}
