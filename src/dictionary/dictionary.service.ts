import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import { User } from '../user/user.entity';
import { GameProviderService } from '../game-provider/game-provider.service';

// 平台字典介面
export interface PlatformDictionary {
  code: string;
  name: string;
  category?: string;
  isActive: boolean;
}

// 代理簡化介面
export interface AgentListItem {
  id: number;
  name: string;
  username: string;
  level: number;
  isActive: boolean;
}

@Injectable()
export class DictionaryService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private gameProviderService: GameProviderService,
  ) {}

  /**
   * 根據公司取得平台字典
   */
  async getPlatformsByCompany(companySlug: string): Promise<PlatformDictionary[]> {
    // 先找到公司
    const company = await this.companyRepository.findOne({
      where: { code: companySlug }
    });

    if (!company) {
      throw new NotFoundException(`找不到公司: ${companySlug}`);
    }

    // 從資料庫取得所有啟用的遊戲提供商
    const providers = await this.gameProviderService.getActiveProviders();
    
    // 轉換為平台字典格式
    return providers.map(provider => ({
      code: provider.code,
      name: provider.name,
      category: provider.category,
      isActive: provider.isActive,
    }));
  }

  /**
   * 根據公司取得代理清單
   */
  async getAgentsByCompany(
    companySlug: string, 
    activeOnly?: boolean,
    keyword?: string
  ): Promise<AgentListItem[]> {
    // 先找到公司
    const company = await this.companyRepository.findOne({
      where: { code: companySlug }
    });

    if (!company) {
      throw new NotFoundException(`找不到公司: ${companySlug}`);
    }

    // 建立查詢條件
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.company_id = :companyId', { companyId: company.id })
      .andWhere('user.role LIKE :rolePattern', { rolePattern: 'AGENT_%' });

    // 篩選啟用狀態
    if (activeOnly) {
      queryBuilder.andWhere('user.status = :status', { status: 'ACTIVE' });
    }

    // 關鍵字搜尋
    if (keyword) {
      queryBuilder.andWhere(
        '(user.username LIKE :keyword OR user.agent_name LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder
      .orderBy('user.agent_level', 'ASC')
      .addOrderBy('user.username', 'ASC');

    const agents = await queryBuilder.getMany();

    // 轉換為簡化格式
    const result = agents.map(agent => ({
      id: agent.id,
      name: agent.agent_name || agent.username || `代理${agent.id}`,
      username: agent.username,
      level: this.extractAgentLevel(agent.role),
      isActive: agent.status === 'ACTIVE',
    }));

    return result;
  }

  /**
   * 從角色字串提取代理等級
   */
  private extractAgentLevel(role: string): number {
    const match = role.match(/AGENT_LEVEL_(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}