import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInfo } from './contact-info.entity';
import { Company } from '../company/company.entity';
import { CreateContactInfoDto } from './dto/create-contact-info.dto';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';

@Injectable()
export class ContactInfoService {
  constructor(
    @InjectRepository(ContactInfo)
    private readonly contactInfoRepository: Repository<ContactInfo>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(createContactInfoDto: CreateContactInfoDto, companyId: number, createdBy: number): Promise<ContactInfo> {
    const contactInfo = this.contactInfoRepository.create({
      ...createContactInfoDto,
      companyId,
      createdBy,
    });

    return await this.contactInfoRepository.save(contactInfo);
  }

  async findAllByCompany(companyId: number): Promise<ContactInfo[]> {
    return await this.contactInfoRepository.find({
      where: { companyId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findActiveByCompany(companyId: number): Promise<ContactInfo[]> {
    return await this.contactInfoRepository.find({
      where: { 
        companyId,
        status: 'active' 
      },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ContactInfo> {
    const contactInfo = await this.contactInfoRepository.findOne({
      where: { id },
    });

    if (!contactInfo) {
      throw new NotFoundException(`聯絡資訊 ID ${id} 不存在`);
    }

    return contactInfo;
  }

  async update(id: number, updateContactInfoDto: UpdateContactInfoDto): Promise<ContactInfo> {
    const contactInfo = await this.findOne(id);

    Object.assign(contactInfo, updateContactInfoDto);

    return await this.contactInfoRepository.save(contactInfo);
  }

  async remove(id: number): Promise<void> {
    const contactInfo = await this.findOne(id);
    await this.contactInfoRepository.remove(contactInfo);
  }

  async updateSortOrder(items: { id: number; sortOrder: number }[]): Promise<void> {
    for (const item of items) {
      await this.contactInfoRepository.update(item.id, { sortOrder: item.sortOrder });
    }
  }

  async findActiveByCompanyCode(companyCode: string): Promise<ContactInfo[]> {
    // 先根據公司代碼找到公司ID
    const company = await this.companyRepository.findOne({
      where: { code: companyCode },
    });

    if (!company) {
      return []; // 如果找不到公司，返回空陣列
    }

    return await this.contactInfoRepository.find({
      where: { 
        companyId: company.id,
        status: 'active' 
      },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }
}