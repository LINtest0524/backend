import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingRuleTemplate } from './shipping-rule-template.entity';
import { ShippingRuleTemplateItem } from './shipping-rule-template-item.entity';
import { CreateShippingRuleTemplateDto } from './dto/create-shipping-rule-template.dto';
import { UpdateShippingRuleTemplateDto } from './dto/update-shipping-rule-template.dto';

@Injectable()
export class ShippingRuleTemplateService {
  constructor(
    @InjectRepository(ShippingRuleTemplate)
    private templateRepository: Repository<ShippingRuleTemplate>,
    @InjectRepository(ShippingRuleTemplateItem)
    private itemRepository: Repository<ShippingRuleTemplateItem>,
  ) {}

  async create(createDto: CreateShippingRuleTemplateDto): Promise<ShippingRuleTemplate> {
    // 如果設為預設，先將其他模板設為非預設
    if (createDto.is_default) {
      await this.templateRepository.update(
        { company_id: createDto.company_id, is_default: true },
        { is_default: false }
      );
    }

    const template = this.templateRepository.create({
      name: createDto.name,
      description: createDto.description,
      is_default: createDto.is_default || false,
      is_active: createDto.is_active !== false,
      company_id: createDto.company_id,
    });

    const savedTemplate = await this.templateRepository.save(template);

    // 建立運費規則項目
    if (createDto.items && createDto.items.length > 0) {
      const items = createDto.items.map(item => 
        this.itemRepository.create({
          ...item,
          template_id: savedTemplate.id,
        })
      );
      await this.itemRepository.save(items);
    }

    return this.findOne(savedTemplate.id);
  }

  async findAll(companyId?: number): Promise<ShippingRuleTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.items', 'items')
      .orderBy('template.is_default', 'DESC')
      .addOrderBy('template.created_at', 'ASC')
      .addOrderBy('items.sort_order', 'ASC');

    if (companyId) {
      query.andWhere('template.company_id = :companyId', { companyId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<ShippingRuleTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!template) {
      throw new NotFoundException(`運費方案 ID ${id} 不存在`);
    }

    return template;
  }

  async findDefault(companyId?: number): Promise<ShippingRuleTemplate> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.items', 'items')
      .where('template.is_default = :isDefault', { isDefault: true })
      .andWhere('template.is_active = :isActive', { isActive: true })
      .orderBy('items.sort_order', 'ASC');

    if (companyId) {
      query.andWhere('template.company_id = :companyId', { companyId });
    }

    const template = await query.getOne();
    
    if (!template) {
      throw new NotFoundException('找不到預設運費方案');
    }

    return template;
  }

  async update(id: number, updateDto: UpdateShippingRuleTemplateDto): Promise<ShippingRuleTemplate> {
    const template = await this.findOne(id);

    // 如果設為預設，先將其他模板設為非預設
    if (updateDto.is_default) {
      await this.templateRepository.update(
        { company_id: template.company_id, is_default: true },
        { is_default: false }
      );
    }

    // 更新模板基本資訊
    await this.templateRepository.update(id, {
      name: updateDto.name,
      description: updateDto.description,
      is_default: updateDto.is_default,
      is_active: updateDto.is_active,
    });

    // 如果有提供新的項目，先刪除舊的再建立新的
    if (updateDto.items) {
      await this.itemRepository.delete({ template_id: id });
      
      if (updateDto.items.length > 0) {
        const items = updateDto.items.map(item => 
          this.itemRepository.create({
            ...item,
            template_id: id,
          })
        );
        await this.itemRepository.save(items);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);
    
    if (template.is_default) {
      throw new Error('無法刪除預設運費方案');
    }

    // 刪除相關的運費項目
    await this.itemRepository.delete({ template_id: id });
    
    // 刪除模板
    await this.templateRepository.remove(template);
  }

  async setDefault(id: number): Promise<ShippingRuleTemplate> {
    const template = await this.findOne(id);

    // 將其他模板設為非預設
    await this.templateRepository.update(
      { company_id: template.company_id, is_default: true },
      { is_default: false }
    );

    // 設定此模板為預設
    await this.templateRepository.update(id, { is_default: true });

    return this.findOne(id);
  }
}