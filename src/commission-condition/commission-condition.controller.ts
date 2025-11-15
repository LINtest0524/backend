import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';
import { CommissionConditionService } from './commission-condition.service';
import { CreateCommissionConditionDto } from './dto/create-commission-condition.dto';
import { UpdateCommissionConditionDto } from './dto/update-commission-condition.dto';
import { CommissionConditionQueryDto } from './dto/commission-condition-query.dto';
import { PreviewCommissionDto } from './dto/preview-commission.dto';
import { PreviewResultDto } from './dto/preview-result.dto';
import { OverlapCheckDto } from './dto/overlap-error.dto';

@Controller('companies/:companyCode/commission-conditions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionConditionController {
  constructor(
    private readonly commissionConditionService: CommissionConditionService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_LEVEL_1)
  create(
    @Param('companyCode') companyCode: string,
    @Body() createCommissionConditionDto: CreateCommissionConditionDto,
    @Request() req: any,
  ) {
    this.validateCompanyAccess(companyCode);
    return this.commissionConditionService.create(
      companyCode,
      createCommissionConditionDto,
      req.user,
    );
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_LEVEL_1,
    UserRole.AGENT_LEVEL_2,
    UserRole.AGENT_LEVEL_3,
    UserRole.AGENT_LEVEL_4,
  )
  findAll(
    @Param('companyCode') companyCode: string,
    @Query() query: CommissionConditionQueryDto,
    @Request() req: any,
  ) {
    this.validateCompanyAccess(companyCode);
    return this.commissionConditionService.findAll(companyCode, query, req.user);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_LEVEL_1,
    UserRole.AGENT_LEVEL_2,
    UserRole.AGENT_LEVEL_3,
    UserRole.AGENT_LEVEL_4,
  )
  findOne(
    @Param('companyCode') companyCode: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    this.validateCompanyAccess(companyCode);
    return this.commissionConditionService.findOne(companyCode, id, req.user);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_LEVEL_1)
  update(
    @Param('companyCode') companyCode: string,
    @Param('id') id: string,
    @Body() updateCommissionConditionDto: UpdateCommissionConditionDto,
    @Request() req: any,
  ) {
    this.validateCompanyAccess(companyCode);
    return this.commissionConditionService.update(
      companyCode,
      id,
      updateCommissionConditionDto,
      req.user,
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_LEVEL_1)
  patchStatus(
    @Param('companyCode') companyCode: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Request() req: any,
  ) {
    this.validateCompanyAccess(companyCode);
    return this.commissionConditionService.patchStatus(
      companyCode,
      id,
      isActive,
      req.user,
    );
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_LEVEL_1)
  remove(
    @Param('companyCode') companyCode: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    this.validateCompanyAccess(companyCode);
    return this.commissionConditionService.remove(companyCode, id, req.user);
  }

  /**
   * 試算分潤方案 (針對現有條件)
   * POST /companies/:companyCode/commission-conditions/:id/preview
   */
  @Post(':id/preview')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_LEVEL_1,
    UserRole.AGENT_LEVEL_2,
    UserRole.AGENT_LEVEL_3,
  )
  async previewExistingCondition(
    @Param('companyCode') companyCode: string,
    @Param('id') id: string,
    @Body() previewDto: PreviewCommissionDto,
  ): Promise<PreviewResultDto> {
    this.validateCompanyAccess(companyCode);
    
    return this.commissionConditionService.previewExistingCondition(
      companyCode,
      id,
      previewDto,
    );
  }

  /**
   * 試算分潤方案 (針對表單數據)
   * POST /companies/:companyCode/commission-conditions/preview
   */
  @Post('preview')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_LEVEL_1,
    UserRole.AGENT_LEVEL_2,
    UserRole.AGENT_LEVEL_3,
  )
  async previewCondition(
    @Param('companyCode') companyCode: string,
    @Body() data: { condition: CreateCommissionConditionDto; preview: PreviewCommissionDto },
  ): Promise<PreviewResultDto> {
    this.validateCompanyAccess(companyCode);
    
    return this.commissionConditionService.previewCondition(
      companyCode,
      data.condition,
      data.preview,
    );
  }

  /**
   * 檢查重疊衝突
   * POST /companies/:companyCode/commission-conditions/check-overlap
   */
  @Post('check-overlap')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_LEVEL_1,
    UserRole.AGENT_LEVEL_2,
    UserRole.AGENT_LEVEL_3,
  )
  async checkOverlap(
    @Param('companyCode') companyCode: string,
    @Body() checkDto: OverlapCheckDto,
  ) {
    this.validateCompanyAccess(companyCode);
    
    return this.commissionConditionService.checkOverlap(companyCode, checkDto);
  }

  /**
   * 驗證公司授權（簡化版，實際可依需求擴展）
   */
  private validateCompanyAccess(companyCode: string) {
    // TODO: 實際實作時可加入更嚴格的公司授權檢查
    if (!companyCode) {
      throw new ForbiddenException('Company code is required');
    }
  }
}