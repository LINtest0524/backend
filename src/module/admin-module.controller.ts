import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CompanyModule } from '../company-module/company-module.entity'
import { Company } from '../company/company.entity'

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
    const companies = await this.companyRepo.find()
    const allSettings = await this.moduleRepo.find({
      where: { module_key: key },
      relations: ['company'],
    })

    return companies.map((c) => {
      const found = allSettings.find((s) => s.company.id === c.id)
      return {
        companyId: c.id,
        companyName: c.name,
        enabled: found?.enabled ?? false,
      }
    })
  }

  @Post(':key')
async saveSettings(
  @Param('key') key: string,
  @Body() updates: { companyId: number; enabled: boolean }[],
) {
  for (const u of updates) {
    // ✅ 先取得 company entity（型別正確）
    const company = await this.companyRepo.findOneBy({ id: u.companyId });
    if (!company) continue; // 或丟錯 throw new NotFoundException()

    // ✅ 查找有無現有模組紀錄（以 entity 查詢，不會 TS 紅線）
    let record = await this.moduleRepo.findOne({
      where: {
        company,
        module_key: key,
      },
    });

    if (record) {
      // ✅ 更新已存在紀錄
      record.enabled = u.enabled;
      await this.moduleRepo.save(record);
    } else {
      // ✅ 新增一筆新的設定
      const newRecord = this.moduleRepo.create({
        company,
        module_key: key,
        enabled: u.enabled,
      });
      await this.moduleRepo.save(newRecord);
    }
  }

  return { message: '儲存成功' };
}

}
