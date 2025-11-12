import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameProvider } from './game-provider.entity';

export interface GameProviderDto {
  code: string;
  name: string;
  category: string;
  isActive: boolean;
  logoUrl?: string;
  description?: string;
}

@Injectable()
export class GameProviderService {
  constructor(
    @InjectRepository(GameProvider)
    private gameProviderRepository: Repository<GameProvider>,
  ) {}

  /**
   * 取得所有啟用的遊戲提供商
   */
  async getActiveProviders(): Promise<GameProviderDto[]> {
    const providers = await this.gameProviderRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return providers.map(provider => ({
      code: provider.code,
      name: provider.name,
      category: provider.category,
      isActive: provider.isActive,
      logoUrl: provider.logoUrl,
      description: provider.description,
    }));
  }

  /**
   * 根據類別取得遊戲提供商
   */
  async getProvidersByCategory(category: string): Promise<GameProviderDto[]> {
    const providers = await this.gameProviderRepository.find({
      where: { 
        isActive: true,
        category: category 
      },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return providers.map(provider => ({
      code: provider.code,
      name: provider.name,
      category: provider.category,
      isActive: provider.isActive,
      logoUrl: provider.logoUrl,
      description: provider.description,
    }));
  }

  /**
   * 取得所有類別
   */
  async getCategories(): Promise<string[]> {
    const result = await this.gameProviderRepository
      .createQueryBuilder('provider')
      .select('DISTINCT provider.category', 'category')
      .where('provider.isActive = :isActive', { isActive: true })
      .getRawMany();

    return result.map(item => item.category);
  }
}