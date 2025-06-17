import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyModule } from '../company-module/company-module.entity';

@UseGuards(JwtAuthGuard)
@Controller('portal/module')
export class PortalModuleController {
  constructor(
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,
  ) {}

  @Get('my-modules')
  async getMyModules(@Req() req: any) {
    const companyId = req.user?.companyId;
    if (!companyId) return [];

    const modules = await this.moduleRepo.find({
      where: { company: { id: companyId }, enabled: true },
    });

    return modules.map((m) => m.module_key);
  }
}
