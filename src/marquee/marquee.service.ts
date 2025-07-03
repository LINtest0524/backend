import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Marquee } from './marquee.entity'
import { Company } from '../company/company.entity'
import { CompanyModule } from '../company-module/company-module.entity'

@Injectable()
export class MarqueeService {
  constructor(
    @InjectRepository(Marquee)
    private marqueeRepo: Repository<Marquee>,

    @InjectRepository(Company)
    private companyRepo: Repository<Company>,

    @InjectRepository(CompanyModule)
    private companyModuleRepo: Repository<CompanyModule>,
  ) {}

  findAll(companyId: number) {
    return this.marqueeRepo.find({
      where: { company: { id: companyId } },
      order: { createdAt: 'DESC' },
    })
  }

  findOne(id: number) {
    return this.marqueeRepo.findOne({ where: { id } })
  }

  create(data: Partial<Marquee>, company: Company) {
    const item = this.marqueeRepo.create({ ...data, company })
    return this.marqueeRepo.save(item)
  }

  update(id: number, data: Partial<Marquee>) {
    return this.marqueeRepo.update(id, data)
  }

  remove(id: number) {
    return this.marqueeRepo.delete(id)
  }

  // ✅ 前台使用：根據公司代號 + 模組是否啟用 + isActive 過濾
  async findByCompanyCode(companyCode: string): Promise<Marquee[]> {
    const company = await this.companyRepo.findOne({
      where: { code: companyCode },
    })

    if (!company) return []

    const isEnabled = await this.companyModuleRepo.findOne({
      where: {
        companyId: company.id,
        module_key: 'marquee',
        enabled: true,
      },
    })

    if (!isEnabled) return []

    return this.marqueeRepo.find({
      where: {
        company: { id: company.id },
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    })
  }


  async findByCompany(companyId: number) {
    return this.marqueeRepo.find({
      where: {
        company: { id: companyId },
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }


}
