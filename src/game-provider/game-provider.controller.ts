import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { GameProviderService } from './game-provider.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/admin/game-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameProviderController {
  constructor(private readonly gameProviderService: GameProviderService) {}

  /**
   * 取得所有啟用的遊戲提供商（Admin 專用）
   * GET /api/admin/game-providers
   */
  @Get()
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async getProviders() {
    console.log('🎮 GameProvider Controller: GET /admin/game-providers 被呼叫了！');
    try {
      const providers = await this.gameProviderService.getActiveProviders();
      console.log(`✅ 成功取得 ${providers.length} 個遊戲提供商:`, providers);
      return providers;
    } catch (error) {
      console.error('❌ 取得遊戲提供商失敗:', error);
      throw error;
    }
  }

  /**
   * 根據類別取得遊戲提供商
   * GET /api/admin/game-providers/category/:category
   */
  @Get('category/:category')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async getProvidersByCategory(@Param('category') category: string) {
    try {
      const providers = await this.gameProviderService.getProvidersByCategory(category);
      return providers;
    } catch (error) {
      console.error('❌ 根據類別取得遊戲提供商失敗:', error);
      throw error;
    }
  }

  /**
   * 取得所有遊戲類別
   * GET /api/admin/game-providers/categories
   */
  @Get('categories')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async getCategories() {
    try {
      const categories = await this.gameProviderService.getCategories();
      return categories;
    } catch (error) {
      console.error('❌ 取得遊戲類別失敗:', error);
      throw error;
    }
  }
}