import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('portal/:companySlug/dictionary')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  /**
   * 取得平台字典清單
   * GET /api/portal/:companySlug/dictionary/platforms
   */
  @Get('platforms')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3')
  async getPlatforms(@Param('companySlug') companySlug: string) {
    console.log(`🎯 取得平台字典 - 公司: ${companySlug}`);
    
    try {
      const platforms = await this.dictionaryService.getPlatformsByCompany(companySlug);
      console.log(`✅ 找到 ${platforms.length} 個平台`);
      return platforms;
    } catch (error) {
      console.error(`❌ 取得平台字典失敗:`, error);
      throw error;
    }
  }

  /**
   * 取得代理清單（簡化版，用於下拉選單）
   * GET /api/portal/:companySlug/dictionary/agents?active=true&keyword=
   */
  @Get('agents')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3')
  async getAgentsList(
    @Param('companySlug') companySlug: string,
    @Query('active') active?: string,
    @Query('keyword') keyword?: string
  ) {
    console.log(`🎯 取得代理清單 - 公司: ${companySlug}, 篩選: active=${active}, keyword=${keyword}`);
    
    try {
      const agents = await this.dictionaryService.getAgentsByCompany(
        companySlug, 
        active === 'true',
        keyword
      );
      console.log(`✅ 找到 ${agents.length} 個代理`);
      return agents;
    } catch (error) {
      console.error(`❌ 取得代理清單失敗:`, error);
      throw error;
    }
  }
}