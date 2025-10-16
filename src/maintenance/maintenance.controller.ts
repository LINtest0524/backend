import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MaintenanceService, MaintenanceDto } from './maintenance.service';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // 管理員：獲取維護設定
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  @Get('admin/:companyId')
  async getMaintenanceStatus(@Param('companyId') companyId: number) {
    const maintenance = await this.maintenanceService.getMaintenanceStatus(companyId);
    return maintenance || {
      companyId,
      isEnabled: false,
      title: '系統維護中',
      message: '系統正在進行維護升級，請稍後再試。',
      backgroundColor: '#1f2937',
      textColor: '#ffffff'
    };
  }

  // 管理員：更新維護設定
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  @Put('admin/:companyId')
  async updateMaintenanceStatus(
    @Param('companyId') companyId: number,
    @Body() data: MaintenanceDto,
    @Request() req: any
  ) {
    return await this.maintenanceService.updateMaintenanceStatus(
      companyId,
      data,
      req.user?.sub
    );
  }

  // 管理員：快速切換維護模式
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  @Post('admin/:companyId/toggle')
  async toggleMaintenance(
    @Param('companyId') companyId: number,
    @Request() req: any
  ) {
    return await this.maintenanceService.toggleMaintenance(
      companyId,
      req.user?.sub
    );
  }

  // 前台：檢查維護狀態
  @Get('status/:companyId')
  async checkMaintenanceStatus(@Param('companyId') companyId: number) {
    return await this.maintenanceService.getMaintenanceInfo(companyId);
  }

  // 前台：獲取維護資訊（給維護頁面使用）
  @Get('info/:companyId')
  async getMaintenanceInfo(@Param('companyId') companyId: number) {
    return await this.maintenanceService.getMaintenanceInfo(companyId);
  }
}