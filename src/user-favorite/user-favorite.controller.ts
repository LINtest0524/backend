import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserFavoriteService, AddFavoriteDto, SyncFavoritesDto } from './user-favorite.service';

@Controller('user-favorites')
@UseGuards(JwtAuthGuard)
export class UserFavoriteController {
  constructor(private readonly userFavoriteService: UserFavoriteService) {}

  /**
   * 獲取當前用戶的所有收藏
   */
  @Get()
  async getUserFavorites(@Req() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.userFavoriteService.getUserFavorites(userId);
  }

  /**
   * 添加收藏
   */
  @Post()
  async addFavorite(@Req() req: any, @Body() dto: AddFavoriteDto) {
    const userId = req.user.userId || req.user.id;
    return this.userFavoriteService.addFavorite(userId, dto);
  }

  /**
   * 移除收藏
   */
  @Delete(':itemType/:itemId')
  async removeFavorite(
    @Req() req: any,
    @Param('itemType') itemType: string,
    @Param('itemId') itemId: number
  ) {
    const userId = req.user.userId || req.user.id;
    return this.userFavoriteService.removeFavorite(userId, itemType, itemId);
  }

  /**
   * 檢查是否已收藏
   */
  @Get('check/:itemType/:itemId')
  async isFavorite(
    @Req() req: any,
    @Param('itemType') itemType: string,
    @Param('itemId') itemId: number
  ) {
    const userId = req.user.userId || req.user.id;
    const isFavorite = await this.userFavoriteService.isFavorite(userId, itemType, itemId);
    return { isFavorite };
  }

  /**
   * 清空所有收藏
   */
  @Delete()
  async clearAllFavorites(@Req() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.userFavoriteService.clearAllFavorites(userId);
  }

  /**
   * 批量同步收藏（用於本地數據同步）
   */
  @Post('sync')
  async syncFavorites(@Req() req: any, @Body() dto: SyncFavoritesDto) {
    const userId = req.user.userId || req.user.id;
    return this.userFavoriteService.syncFavorites(userId, dto);
  }

  /**
   * 獲取收藏統計
   */
  @Get('stats')
  async getFavoriteStats(@Req() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.userFavoriteService.getFavoriteStats(userId);
  }
}