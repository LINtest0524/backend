import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logo } from './logo.entity';
import { CreateLogoDto } from './dto/create-logo.dto';
import { UpdateLogoDto } from './dto/update-logo.dto';
import { UserRole } from '../user/user.entity';

@Injectable()
export class LogoService {
  constructor(
    @InjectRepository(Logo)
    private logoRepository: Repository<Logo>,
  ) {}

  async create(createLogoDto: CreateLogoDto, companyId: number): Promise<Logo> {
    const logo = this.logoRepository.create({
      ...createLogoDto,
      companyId,
    });
    return await this.logoRepository.save(logo);
  }

  async findAll(userRole: UserRole, userCompanyId?: number) {
    const queryBuilder = this.logoRepository.createQueryBuilder('logo')
      .leftJoinAndSelect('logo.company', 'company');

    // 權限控制
    if (userRole === UserRole.AGENT_OWNER && userCompanyId) {
      // 代理商老闆只能看到自己公司的 LOGO
      queryBuilder.where('logo.companyId = :companyId', { companyId: userCompanyId });
    }
    // SUPER_ADMIN 和 GLOBAL_ADMIN 可以看到所有 LOGO

    return await queryBuilder
      .orderBy('logo.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<Logo> {
    const logo = await this.logoRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!logo) {
      throw new NotFoundException(`Logo with ID ${id} not found`);
    }

    return logo;
  }

  async findByCompany(companyId: number): Promise<Logo | null> {
    return await this.logoRepository.findOne({
      where: { companyId, is_active: true },
      relations: ['company'],
    });
  }

  async update(
    id: number, 
    updateLogoDto: UpdateLogoDto, 
    userRole: UserRole, 
    userCompanyId?: number
  ): Promise<Logo> {
    const logo = await this.findOne(id);

    // 權限檢查
    if (userRole === UserRole.AGENT_OWNER && logo.companyId !== userCompanyId) {
      throw new ForbiddenException('You can only update your own company logo');
    }

    Object.assign(logo, updateLogoDto);
    return await this.logoRepository.save(logo);
  }

  async remove(id: number, userRole: UserRole, userCompanyId?: number): Promise<void> {
    const logo = await this.findOne(id);

    // 權限檢查
    if (userRole === UserRole.AGENT_OWNER && logo.companyId !== userCompanyId) {
      throw new ForbiddenException('You can only delete your own company logo');
    }

    await this.logoRepository.remove(logo);
  }
}