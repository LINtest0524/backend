import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findByCode(code: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { code },
      select: ['id', 'code', 'name', 'status', 'shipping_rules', 'settings', 'created_at', 'updated_at']
    });
  }

  async findById(id: number): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { id },
      select: ['id', 'code', 'name', 'status', 'shipping_rules', 'settings', 'created_at', 'updated_at']
    });
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      order: { created_at: 'DESC' }
    });
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // 檢查代碼是否已存在
    const existingCompany = await this.findByCode(createCompanyDto.code);
    if (existingCompany) {
      throw new ConflictException(`公司代碼 "${createCompanyDto.code}" 已存在`);
    }

    const company = this.companyRepository.create(createCompanyDto);
    return await this.companyRepository.save(company);
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findById(id);
    if (!company) {
      throw new NotFoundException('公司不存在');
    }

    // 如果更新代碼，檢查是否與其他公司衝突
    if (updateCompanyDto.code && updateCompanyDto.code !== company.code) {
      const existingCompany = await this.findByCode(updateCompanyDto.code);
      if (existingCompany) {
        throw new ConflictException(`公司代碼 "${updateCompanyDto.code}" 已存在`);
      }
    }

    Object.assign(company, updateCompanyDto);
    return await this.companyRepository.save(company);
  }

  async remove(id: number): Promise<void> {
    const company = await this.findById(id);
    if (!company) {
      throw new NotFoundException('公司不存在');
    }

    await this.companyRepository.remove(company);
  }

  async updateStatus(id: number, status: 'active' | 'inactive'): Promise<Company> {
    const company = await this.findById(id);
    if (!company) {
      throw new NotFoundException('公司不存在');
    }

    company.status = status;
    return await this.companyRepository.save(company);
  }

  async updateShippingRules(id: number, shippingRules: any[]): Promise<Company | null> {
    await this.companyRepository.update(id, { shipping_rules: shippingRules });
    return this.findById(id);
  }

  async getActiveCompanies(): Promise<Company[]> {
    return this.companyRepository.find({
      where: { status: 'active' },
      order: { name: 'ASC' }
    });
  }

  async getCompanyConfig(code: string): Promise<{ id: number; code: string; name: string; settings: any } | null> {
    const company = await this.companyRepository.findOne({
      where: { code, status: 'active' },
      select: ['id', 'code', 'name', 'settings']
    });

    return company ? {
      id: company.id,
      code: company.code,
      name: company.name,
      settings: company.settings || {}
    } : null;
  }
}