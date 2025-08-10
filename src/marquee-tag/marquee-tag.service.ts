import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarqueeTag } from './marquee-tag.entity';
import { Company } from '../company/company.entity';

@Injectable()
export class MarqueeTagService {
  constructor(
    @InjectRepository(MarqueeTag)
    private readonly marqueeTagRepo: Repository<MarqueeTag>,
  ) {}

  async findAll(companyId?: number): Promise<MarqueeTag[]> {
    const query = this.marqueeTagRepo.createQueryBuilder('tag')
      .leftJoinAndSelect('tag.company', 'company');

    if (companyId) {
      query.where('tag.company.id = :companyId', { companyId });
    }

    return query.orderBy('tag.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<MarqueeTag | null> {
    return this.marqueeTagRepo.findOne({
      where: { id },
      relations: ['company'],
    });
  }

  async findByCompany(companyId: number): Promise<MarqueeTag[]> {
    return this.marqueeTagRepo.find({
      where: { 
        company: { id: companyId },
        isActive: true 
      },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: any, company: Company): Promise<MarqueeTag> {
    const tag = this.marqueeTagRepo.create({
      ...data,
      company,
    } as Partial<MarqueeTag>);
    return await this.marqueeTagRepo.save(tag);
  }

  async update(id: number, data: any): Promise<MarqueeTag | null> {
    await this.marqueeTagRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.marqueeTagRepo.delete(id);
  }
}