import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findByCode(code: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { code }
    });
  }

  async findById(id: number): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { id }
    });
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find();
  }

  async updateShippingRules(id: number, shippingRules: any[]): Promise<Company | null> {
    await this.companyRepository.update(id, { shipping_rules: shippingRules });
    return this.findById(id);
  }
}