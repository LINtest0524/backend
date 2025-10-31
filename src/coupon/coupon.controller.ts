import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  Delete,
  UseGuards, 
  Req,
  ParseIntPipe,
  BadRequestException,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { Request } from 'express';
import { CouponService } from './coupon.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCouponTemplateDto } from './dto/create-coupon-template.dto';
import { PublicCouponDto } from './dto/public-coupon.dto';
import { BatchCouponDto } from './dto/batch-coupon.dto';
import { ValidateCouponDto, UseCouponDto } from './dto/validate-coupon.dto';
import { DistributeCouponDto } from './dto/distribute-coupon.dto';

// 管理員端優惠碼控制器
@Controller('api/admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
export class AdminCouponController {
  constructor(private readonly couponService: CouponService) {}


  // 創建優惠碼模板
  @Post('templates')
  async createTemplate(@Body() createDto: CreateCouponTemplateDto, @Req() req: Request) {
    const user = req.user as any;
    
    // 檢查是否有管理員權限
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限創建優惠碼模板');
    }

    const result = await this.couponService.createTemplate(user.companyId, createDto);
    
    // 記錄操作到 audit log
    try {
      await this.couponService.recordCouponOperation({
        operatorUser: { 
          id: user.sub || user.id,
          username: user.username,
          role: user.role
        },
        operationType: 'CREATE_TEMPLATE',
        templateId: result.id,
        templateName: result.name,
        afterStatus: '已創建',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
        platform: req.get('User-Agent') || 'unknown',
      });
    } catch (error) {
      console.error('記錄優惠券創建操作失敗:', error);
    }

    return result;
  }

  // 獲取模板列表
  @Get('templates')
  async getTemplates(@Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看優惠碼模板');
    }

    return await this.couponService.getTemplates(user.companyId);
  }

  // 獲取模板詳情
  @Get('templates/:id')
  async getTemplate(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看優惠碼模板詳情');
    }

    return await this.couponService.getTemplate(id, user.companyId);
  }

  // 刪除模板
  @Delete('templates/:id')
  async deleteTemplate(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限刪除優惠碼模板');
    }

    // 先獲取模板資訊（刪除前）
    const template = await this.couponService.getTemplate(id, user.companyId);
    
    const result = await this.couponService.deleteTemplate(id, user.companyId);
    
    // 記錄操作到 audit log
    try {
      await this.couponService.recordCouponOperation({
        operatorUser: { 
          id: user.sub || user.id,
          username: user.username,
          role: user.role
        },
        operationType: 'DELETE_TEMPLATE',
        templateId: id,
        templateName: template?.name || `模板${id}`,
        beforeStatus: '已創建',
        afterStatus: '已刪除',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
        platform: req.get('User-Agent') || 'unknown',
      });
    } catch (error) {
      console.error('記錄優惠券刪除操作失敗:', error);
    }

    return result;
  }

  // 發放公共優惠碼
  @Post('distribute/public')
  async distributePublicCoupon(@Body() dto: PublicCouponDto, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限發放優惠碼');
    }

    const result = await this.couponService.distributePublicCoupon(user.companyId, user.id, dto);

    return result;
  }

  // 發放批量優惠碼
  @Post('distribute/batch')
  async distributeBatchCoupons(@Body() dto: DistributeCouponDto, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限發放優惠碼');
    }

    const result = await this.couponService.distributeBatchCoupons(user.companyId, user.id, dto);
    
    // 記錄操作到 audit log
    try {
      await this.couponService.recordCouponOperation({
        operatorUser: { 
          id: user.sub || user.id,
          username: user.username,
          role: user.role
        },
        operationType: 'DISTRIBUTE_COUPON',
        templateId: dto.templateId,
        targetUser: dto.targetType === 'ALL_USERS' ? '所有用戶' : 
                   dto.targetType === 'TAG_GROUP' ? `標籤群組: ${dto.tagIds?.join(', ') || '未指定'}` :
                   dto.targetType === 'SPECIFIC_USERS' ? `指定用戶: ${dto.userIds?.join(', ') || '未指定'}` :
                   `${dto.quantity || 1} 個用戶`,
        afterStatus: '已發放',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
        platform: req.get('User-Agent') || 'unknown',
      });
    } catch (error) {
      console.error('記錄優惠券發放操作失敗:', error);
    }

    return result;
  }

  // 獲取優惠碼統計
  @Get('stats')
  async getCouponStats(@Query('templateId', ParseIntPipe) templateId: number, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看統計');
    }

    return await this.couponService.getCouponStats(templateId, user.companyId);
  }

  // 創建現金優惠券
  @Post('create-cash-coupon')
  async createCashCoupon(@Body() body: { templateId: number; code: string }, @Req() req: Request) {
    const user = req.user as any
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限創建現金優惠券');
    }
    
    if (!body.templateId || !body.code) {
      throw new BadRequestException('模板ID和優惠碼均為必填')
    }

    const result = await this.couponService.createCashCoupon(body.templateId, body.code, user.companyId);
    
    // 記錄操作到 audit log
    try {
      await this.couponService.recordCouponOperation({
        operatorUser: { 
          id: user.sub || user.id,
          username: user.username,
          role: user.role
        },
        operationType: 'DISTRIBUTE_COUPON',
        templateId: body.templateId,
        couponCode: body.code,
        afterStatus: '已創建',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
        platform: req.get('User-Agent') || 'unknown',
      });
    } catch (error) {
      console.error('記錄現金優惠券創建操作失敗:', error);
    }

    return result;
  }

  // 獲取現金優惠券列表
  @Get('cash-coupons/:templateId')
  async getCashCoupons(@Param('templateId', ParseIntPipe) templateId: number, @Req() req: Request) {
    const user = req.user as any
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看現金優惠券');
    }
    
    return this.couponService.getCashCoupons(templateId, user.companyId)
  }

  // 刪除現金優惠券
  @Delete('cash-coupons/:couponId')
  async deleteCashCoupon(@Param('couponId', ParseIntPipe) couponId: number, @Req() req: Request) {
    const user = req.user as any
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限刪除現金優惠券');
    }
    
    return this.couponService.deleteCashCoupon(couponId, user.companyId)
  }
}

// 用戶端優惠碼控制器
@Controller('api/portal/coupons')
@UseGuards(JwtAuthGuard)
export class PortalCouponController {
  constructor(private readonly couponService: CouponService) {}

  // 獲取我的優惠碼
  @Get('my-coupons')
  async getMyCoupons(@Req() req: Request) {
    const user = req.user as any;
    return await this.couponService.getUserCoupons(user.id, user.companyId);
  }

  // 驗證批量派發結果（移到 AdminCouponController）

  // 驗證優惠碼
  @Post('validate')
  @HttpCode(HttpStatus.OK) // 明確返回 200 OK
  async validateCoupon(@Body() dto: ValidateCouponDto, @Req() req: Request) {
    const user = req.user as any;
    return await this.couponService.validateCoupon(user.id, user.companyId, dto);
  }

  // 使用優惠碼
  @Post('use')
  @HttpCode(HttpStatus.OK) // 明確返回 200 OK
  async useCoupon(@Body() dto: UseCouponDto, @Req() req: Request) {
    const user = req.user as any;
    return await this.couponService.useCoupon(user.id, user.companyId, dto);
  }

  // 兌換現金優惠券
  @Post('redeem-cash')
  async redeemCashCoupon(@Body() body: { code: string }, @Req() req: Request) {
    const user = req.user as any;
    
    if (!body.code) {
      throw new BadRequestException('請輸入優惠碼');
    }

    return await this.couponService.redeemCashCoupon(user.id, user.companyId, body.code);
  }
}