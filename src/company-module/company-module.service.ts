import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyModule } from './company-module.entity';
import { Company } from '../company/company.entity';

@Injectable()
export class CompanyModuleService {
  constructor(
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async getModuleSettings(moduleKey: string) {
    const companies = await this.companyRepo.find();
    const allModules = await this.moduleRepo.find({
      where: { module_key: moduleKey },
    });

    return companies.map((company) => {
      const setting = allModules.find((m) => m.companyId === company.id);
      return {
        companyId: company.id,
        companyName: company.name,
        enabled: setting ? setting.enabled : false,
      };
    });
  }

  async updateModuleSettings(
    moduleKey: string,
    settings: { companyId: number; enabled: boolean }[],
  ) {
    for (const s of settings) {
      const existing = await this.moduleRepo.findOne({
        where: { companyId: s.companyId, module_key: moduleKey },
      });

      if (existing) {
        existing.enabled = s.enabled;
        await this.moduleRepo.save(existing);
      } else {
        const newRecord = this.moduleRepo.create({
          companyId: s.companyId,
          module_key: moduleKey,
          enabled: s.enabled,
          pages: ['home'], // ✅ 確保跟你原本一致
          exclude_pages: ['login'],
        });
        await this.moduleRepo.save(newRecord);
      }
    }

    return { success: true };
  }

}
