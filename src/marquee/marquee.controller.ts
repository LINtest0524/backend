import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { MarqueeService } from './marquee.service'

@Controller('admin/marquee') // ✅ 改這行，從 admin/module/marquee ➜ admin/marquee
export class MarqueeController {
  constructor(private readonly marqueeService: MarqueeService) {}

  @Get(':companyId')
  getAll(@Param('companyId') companyId: number) {
    return this.marqueeService.findAll(companyId)
  }

  @Get('item/:id')
  getOne(@Param('id') id: number) {
    return this.marqueeService.findOne(id)
  }

  @Post()
  create(@Body() body: any) {
    return this.marqueeService.create(body, { id: body.companyId } as any)
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: any) {
    return this.marqueeService.update(id, body)
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.marqueeService.remove(id)
  }
}
