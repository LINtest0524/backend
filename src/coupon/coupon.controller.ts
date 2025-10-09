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
import { CreateCouponTemplateDto } from './dto/create-coupon-template.dto';
import { PublicCouponDto } from './dto/public-coupon.dto';
import { BatchCouponDto } from './dto/batch-coupon.dto';
import { ValidateCouponDto, UseCouponDto } from './dto/validate-coupon.dto';
import { DistributeCouponDto } from './dto/distribute-coupon.dto';

// 管理員端優惠碼控制器
@Controller('api/admin/coupons')
@UseGuards(JwtAuthGuard)
export class AdminCouponController {
  constructor(private readonly couponService: CouponService) {}

  // 創建優惠碼模板
  @Post('templates')
  async createTemplate(@Body() createDto: CreateCouponTemplateDto, @Req() req: Request) {
    const user = req.user as any;
    
    // 檢查是否有管理員權限
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限創建優惠碼模板');
    }

    return await this.couponService.createTemplate(user.companyId, createDto);
  }

  // 獲取模板列表
  @Get('templates')
  async getTemplates(@Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看優惠碼模板');
    }

    return await this.couponService.getTemplates(user.companyId);
  }

  // 獲取模板詳情
  @Get('templates/:id')
  async getTemplate(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看優惠碼模板');
    }

    return await this.couponService.getTemplate(id, user.companyId);
  }

  // 刪除模板
  @Delete('templates/:id')
  async deleteTemplate(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限刪除優惠碼模板');
    }

    return await this.couponService.deleteTemplate(id, user.companyId);
  }

  // 發放公共優惠碼
  @Post('distribute/public')
  async distributePublicCoupon(@Body() dto: PublicCouponDto, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限發放優惠碼');
    }

    return await this.couponService.distributePublicCoupon(user.companyId, user.id, dto);
  }

  // 發放批量優惠碼
  @Post('distribute/batch')
  async distributeBatchCoupons(@Body() dto: DistributeCouponDto, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限發放優惠碼');
    }

    return await this.couponService.distributeBatchCoupons(user.companyId, user.id, dto);
  }

  // 獲取優惠碼統計
  @Get('stats')
  async getCouponStats(@Query('templateId', ParseIntPipe) templateId: number, @Req() req: Request) {
    const user = req.user as any;
    
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看統計');
    }

    return await this.couponService.getCouponStats(templateId, user.companyId);
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
    console.log('🎫 前台查詢優惠券的用戶:', { id: user.id, username: user.username, role: user.role });
    return await this.couponService.getUserCoupons(user.id, user.companyId);
  }

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
}