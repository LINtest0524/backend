import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { MenuService } from '../menu/menu.service';
import { MenuDeviceType } from '../menu/menu.entity';

@Controller('portal/menu')
export class PortalMenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenus(
    @Query('company', ParseIntPipe) companyId: number,
    @Query('deviceType') deviceType?: MenuDeviceType,
  ) {
    try {
      // 如果沒有指定 deviceType，返回所有選單讓前端過濾
      const menus = await this.menuService.findByCompany(companyId, deviceType);
      return menus;
    } catch (error) {
      console.error('取得選單失敗:', error);
      return [];
    }
  }
}