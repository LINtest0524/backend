import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyModule } from '../company-module/company-module.entity';
import { Company } from '../company/company.entity';

@Controller('admin/module')
export class AdminModuleController {
  constructor(
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  @Get(':key')
  async getSettings(@Param('key') key: string) {
    const companies = await this.companyRepo.find();
    const allSettings = await this.moduleRepo.find({
      where: { module_key: key },
    });

    return companies.map((c) => {
      const found = allSettings.find((s) => s.companyId === c.id);
      return {
        companyId: c.id,
        companyName: c.name,
        enabled: found?.enabled ?? false,
      };
    });
  }

  @Post(':key')
  async saveSettings(
    @Param('key') key: string,
    @Body() updates: { companyId: number; enabled: boolean }[],
  ) {
    for (const u of updates) {
      const company = await this.companyRepo.findOneBy({ id: u.companyId });
      if (!company) continue;

      let record = await this.moduleRepo.findOne({
        where: {
          companyId: u.companyId,
          module_key: key,
        },
      });

      if (record) {
        record.enabled = u.enabled;
        record.pages ??= ['home']; // ✅ 防止 null 造成重複 insert
        record.exclude_pages ??= ['login'];
        await this.moduleRepo.save(record);
      } else {
        const newRecord = this.moduleRepo.create({
          companyId: u.companyId,
          module_key: key,
          enabled: u.enabled,
          pages: ['home'],
          exclude_pages: ['login'],
        });
        await this.moduleRepo.save(newRecord);
      }
    }

    return { message: '儲存成功' };
  }
}
