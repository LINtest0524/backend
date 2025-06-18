import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Marquee } from './marquee.entity'
import { Company } from '../company/company.entity'

@Injectable()
export class MarqueeService {
  constructor(
    @InjectRepository(Marquee)
    private marqueeRepo: Repository<Marquee>,
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

  // ✅ 新增：給前台用的查詢方法
  findByCompanyCode(companyCode: string) {
    return this.marqueeRepo.find({
      where: {
        company: { code: companyCode },
        isActive: true,
      },
      order: { createdAt: 'DESC' },
      relations: ['company'],
    })
  }
}
