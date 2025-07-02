// backend/src/company/company.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  @Get()
  @Roles('SUPER_ADMIN')
  async getAllCompanies() {
    return await this.companyRepository.find({
      select: ['id', 'name'], // 如果只需要這兩個欄位
      order: { id: 'ASC' },
    });
  }
}
