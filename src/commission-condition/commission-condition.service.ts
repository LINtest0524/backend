import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionCondition } from './entities/commission-condition.entity';
import { ConditionGroup } from './entities/condition-group.entity';
import { PlatformRefundRate } from './entities/platform-refund-rate.entity';
import { FixedCost } from './entities/fixed-cost.entity';
import { CreateCommissionConditionDto } from './dto/create-commission-condition.dto';
import { UpdateCommissionConditionDto } from './dto/update-commission-condition.dto';
import { CommissionConditionQueryDto } from './dto/commission-condition-query.dto';
import { PreviewCommissionDto } from './dto/preview-commission.dto';
import { PreviewResultDto, MatchedGroup, CalculationResult, PlatformRefund } from './dto/preview-result.dto';
import { OverlapErrorDto, ConflictCondition, OverlapCheckDto } from './dto/overlap-error.dto';
import { DateOverlapUtil } from './utils/date-overlap.util';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';
import { AgentService } from '../agent/agent.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class CommissionConditionService {
  constructor(
    @InjectRepository(CommissionCondition)
    private commissionConditionRepository: Repository<CommissionCondition>,
    @InjectRepository(ConditionGroup)
    private conditionGroupRepository: Repository<ConditionGroup>,
    @InjectRepository(PlatformRefundRate)
    private platformRefundRateRepository: Repository<PlatformRefundRate>,
    @InjectRepository(FixedCost)
    private fixedCostRepository: Repository<FixedCost>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private agentService: AgentService,
    private auditLogService: AuditLogService,
  ) {}

  async create(companyCode: string, dto: CreateCommissionConditionDto, user?: any) {
    // 1. 驗證公司存在
    const company = await this.companyRepository.findOne({
      where: { code: companyCode },
    });
    if (!company) {
      throw new NotFoundException(`Company with code ${companyCode} not found`);
    }

    // 2. 佣金條件是方案池概念，不需要重疊檢查

    // 3. 驗證代理商（agentId=0 表示任意代理商，跳過驗證）
    let agent: User | null = null;
    if (dto.agentId !== 0) {
      agent = await this.userRepository.findOne({
        where: { id: dto.agentId, company_id: company.id },
      });
      if (!agent) {
        throw new BadRequestException('Agent not found in this company');
      }
    }

    // 3. 驗證日期範圍
    if (dto.effectiveFrom && dto.effectiveTo) {
      const fromDate = new Date(dto.effectiveFrom);
      const toDate = new Date(dto.effectiveTo);
      if (fromDate > toDate) {
        throw new BadRequestException('effectiveFrom must be before effectiveTo');
      }
    }

    // 4. 驗證平台代碼不重複（同一 group 內）
    for (const group of dto.groups) {
      if (group.platformRefundRates) {
        const platformCodes = group.platformRefundRates.map(r => r.platformCode);
        const uniqueCodes = new Set(platformCodes);
        if (platformCodes.length !== uniqueCodes.size) {
          throw new BadRequestException('Duplicate platformCode in same group');
        }
      }
    }

    // 5. 建立主檔
    const commissionCondition = this.commissionConditionRepository.create({
      name: dto.name,
      method: dto.method,
      isActive: dto.isActive ?? true,
      systemType: dto.systemType,
      agentLevel: dto.agentLevel,
      commissionPercent: dto.commissionPercent,
      gameRebateRates: dto.gameRebateRates,
      settlementCycle: dto.settlementCycle,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      companyId: company.id,
      agentId: dto.agentId,
    });

    const savedCondition = await this.commissionConditionRepository.save(commissionCondition);

    // 6. 建立條件群組
    for (let i = 0; i < dto.groups.length; i++) {
      const groupDto = dto.groups[i];
      const group = this.conditionGroupRepository.create({
        minRegistrations: groupDto.minRegistrations || 0,
        minActiveMembers: groupDto.minActiveMembers || 0,
        minValidBets: groupDto.minValidBets || 0,
        requireNegativeProfit: groupDto.requireNegativeProfit || false,
        minNetRevenue: groupDto.minNetRevenue?.toString() || '0',
        sharePercent: groupDto.sharePercent.toString(),
        agentRemitPercent: groupDto.agentRemitPercent.toString(),
        order: i + 1,
        commissionConditionId: savedCondition.id,
      });

      const savedGroup = await this.conditionGroupRepository.save(group);

      // 建立平台退水費率
      if (groupDto.platformRefundRates) {
        for (const rateDto of groupDto.platformRefundRates) {
          const rate = this.platformRefundRateRepository.create({
            platformCode: rateDto.platformCode,
            refundPercent: rateDto.refundPercent.toString(),
            conditionGroupId: savedGroup.id,
          });
          await this.platformRefundRateRepository.save(rate);
        }
      }

      // 建立固定費用
      if (groupDto.fixedCost) {
        const cost = this.fixedCostRepository.create({
          feeDeposit: groupDto.fixedCost.feeDeposit?.toString() || '0',
          feeWithdraw: groupDto.fixedCost.feeWithdraw?.toString() || '0',
          refundBudgetPercent: groupDto.fixedCost.refundBudgetPercent?.toString() || '0',
          promoBudgetPercent: groupDto.fixedCost.promoBudgetPercent?.toString() || '0',
          bonusBudgetPercent: groupDto.fixedCost.bonusBudgetPercent?.toString() || '0',
          conditionGroupId: savedGroup.id,
        });
        await this.fixedCostRepository.save(cost);
      }
    }

    // 記錄審計日誌
    if (user) {
      try {
        await this.auditLogService.record({
          user: user,
          action: `新增分潤方案「${dto.name}」`,
          ip: user.ip || 'Unknown',
          platform: user.platform || 'Web',
          target: `CommissionCondition:${savedCondition.id}`,
          before: null,
          after: {
            id: savedCondition.id,
            name: dto.name,
            agentId: dto.agentId,
            method: dto.method,
            systemType: dto.systemType,
            agentLevel: dto.agentLevel,
            commissionPercent: dto.commissionPercent,
            gameRebateRates: dto.gameRebateRates,
            settlementCycle: dto.settlementCycle,
            isActive: dto.isActive ?? true
          },
        });
      } catch (auditError) {
        console.error('記錄審計日誌失敗:', auditError);
      }
    }

    return this.findOne(companyCode, savedCondition.id);
  }

  async findAll(companyCode: string, query: CommissionConditionQueryDto, user?: any) {
    // 驗證公司存在
    const company = await this.companyRepository.findOne({
      where: { code: companyCode },
    });
    if (!company) {
      throw new NotFoundException(`Company with code ${companyCode} not found`);
    }

    const { page = 1, limit = 50, commissionPercentMin, commissionPercentMax, settlementCycle, systemType } = query;
    
    // 記錄查詢參數和用戶資訊（僅開發環境）
    if (process.env.NODE_ENV === 'development') {
    }
    
    const skip = (page - 1) * limit;

    const queryBuilder = this.commissionConditionRepository
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.agent', 'agent')
      .leftJoinAndSelect('cc.groups', 'groups')
      .where('cc.companyId = :companyId', { companyId: company.id })
      .orderBy('cc.updatedAt', 'DESC');

    // 🔐 根據用戶角色進行權限過濾
    if (user) {
      const userRole = user.role;
      const userId = user.id;
      
      if (userRole === 'SUPER_ADMIN' || userRole === 'GLOBAL_ADMIN') {
        // 超級管理員和全域管理員可以看到所有資料，不需要額外過濾
        if (process.env.NODE_ENV === 'development') {
        }
      } else if (userRole.startsWith('AGENT_LEVEL_') || userRole === 'AGENT_OWNER') {
        // 代理商可以看到自己和下級代理商的佣金條件
        if (process.env.NODE_ENV === 'development') {
        }
        
        try {
          // 獲取當前用戶的代理商資料
          const currentAgent = await this.agentService.findAgentByUserId(userId, company.id);
          
          if (currentAgent) {
            // 獲取當前代理商和所有下級代理商
            const hierarchyAgents = await this.agentService.findAgentHierarchy(currentAgent.id, company.id);
            const agentIds = hierarchyAgents.map(agent => agent.id);
            
            // 檢查當前代理商是否有指定的占成條件
            const currentUser = await this.userRepository.findOne({
              where: { id: userId },
              select: ['commission_condition_id']
            });
            
            if (process.env.NODE_ENV === 'development') {
            }
            
            // 構建查詢條件
            const conditions = ['cc.agentId IN (:...agentIds)'];
            const parameters: any = { agentIds };
            
            // 如果代理商有指定占成條件，也要包含該條件
            if (currentUser?.commission_condition_id) {
              conditions.push('cc.id = :commissionConditionId');
              parameters.commissionConditionId = currentUser.commission_condition_id;
            }
            
            // 使用 OR 連接條件
            queryBuilder.andWhere(`(${conditions.join(' OR ')})`, parameters);
          } else {
            // 如果找不到對應的代理商，檢查是否有指定的占成條件
            const currentUser = await this.userRepository.findOne({
              where: { id: userId },
              select: ['commission_condition_id']
            });
            
            if (currentUser?.commission_condition_id) {
              queryBuilder.andWhere('cc.id = :commissionConditionId', { 
                commissionConditionId: currentUser.commission_condition_id 
              });
            } else {
              queryBuilder.andWhere('cc.agentId = 0');
            }
          }
        } catch (error) {
          console.error('❌ Error filtering agent hierarchy:', error);
          // 發生錯誤時，檢查是否有指定的占成條件
          try {
            const currentUser = await this.userRepository.findOne({
              where: { id: userId },
              select: ['commission_condition_id']
            });
            
            if (currentUser?.commission_condition_id) {
              queryBuilder.andWhere('cc.id = :commissionConditionId', { 
                commissionConditionId: currentUser.commission_condition_id 
              });
            } else {
              queryBuilder.andWhere('cc.agentId = 0');
            }
          } catch (fallbackError) {
            console.error('❌ Fallback error:', fallbackError);
            queryBuilder.andWhere('cc.agentId = 0');
          }
        }
      }
    }

    // 新的篩選邏輯
    
    // 1. 分潤比例範圍篩選
    if (commissionPercentMin !== undefined && commissionPercentMin !== null) {
      queryBuilder.andWhere('cc.commissionPercent >= :commissionPercentMin', { commissionPercentMin });
    }
    
    if (commissionPercentMax !== undefined && commissionPercentMax !== null) {
      queryBuilder.andWhere('cc.commissionPercent <= :commissionPercentMax', { commissionPercentMax });
    }
    
    // 2. 代理分潤結算篩選
    if (settlementCycle) {
      queryBuilder.andWhere('cc.settlementCycle = :settlementCycle', { settlementCycle });
    }
    
    // 3. 分潤制度篩選
    if (systemType) {
      queryBuilder.andWhere('cc.systemType = :systemType', { systemType });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // 格式化回應
    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      agentId: item.agentId.toString(),
      agentName: item.agentId === 0 ? '任意代理商' : (item.agent?.agent_name || item.agent?.username || 'Unknown'),
      method: item.method,
      isActive: item.isActive,
      systemType: item.systemType,
      agentLevel: item.agentLevel,
      commissionPercent: item.commissionPercent,
      gameRebateRates: item.gameRebateRates,
      settlementCycle: item.settlementCycle,
      groupCount: item.groups?.length || 0,
      updatedAt: item.updatedAt.toISOString(),
    }));

    if (process.env.NODE_ENV === 'development') {
    }

    return {
      items: formattedItems,
      total,
      page,
      limit,
    };
  }

  async findOne(companyCode: string, id: string, user?: any) {
    // 驗證公司存在
    const company = await this.companyRepository.findOne({
      where: { code: companyCode },
    });
    if (!company) {
      throw new NotFoundException(`Company with code ${companyCode} not found`);
    }

    const condition = await this.commissionConditionRepository.findOne({
      where: { id, companyId: company.id },
      relations: [
        'agent',
        'groups',
        'groups.platformRefundRates',
        'groups.fixedCost',
      ],
      order: {
        groups: { order: 'ASC' },
      },
    });

    if (!condition) {
      throw new NotFoundException('Commission condition not found');
    }

    // 🔐 權限檢查：代理商只能查看自己的佣金條件
    if (user) {
      const userRole = user.role;
      const userId = user.id;
      
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'GLOBAL_ADMIN') {
        // 檢查是否有權限查看此佣金條件
        let hasPermission = false;
        
        try {
          // 1. 檢查是否是代理商自己的佣金條件
          if (condition.agentId === userId) {
            hasPermission = true;
          }
          
          // 2. 檢查是否在代理商層級結構中
          if (!hasPermission) {
            const currentAgent = await this.agentService.findAgentByUserId(userId, company.id);
            if (currentAgent) {
              const hierarchyAgents = await this.agentService.findAgentHierarchy(currentAgent.id, company.id);
              const agentIds = hierarchyAgents.map(agent => agent.id);
              if (agentIds.includes(condition.agentId)) {
                hasPermission = true;
              }
            }
          }
          
          // 3. 檢查是否是代理商被指定的佣金條件
          if (!hasPermission) {
            const currentUser = await this.userRepository.findOne({
              where: { id: userId },
              select: ['commission_condition_id']
            });
            
            if (currentUser?.commission_condition_id === condition.id) {
              hasPermission = true;
            }
          }
          
        } catch (error) {
          console.error('❌ Error checking permission for commission condition:', error);
        }
        
        if (!hasPermission) {
          throw new ForbiddenException('您只能查看自己的佣金條件');
        }
      }
    }

    return condition;
  }

  async update(companyCode: string, id: string, dto: UpdateCommissionConditionDto, user?: any) {
    const existing = await this.findOne(companyCode, id, user);
    
    // 記錄更新前的資料（用於審計日誌）
    const beforeData = {
      id: existing.id,
      name: existing.name,
      agentId: existing.agentId,
      method: existing.method,
      systemType: existing.systemType,
      agentLevel: existing.agentLevel,
      commissionPercent: existing.commissionPercent,
      gameRebateRates: existing.gameRebateRates,
      settlementCycle: existing.settlementCycle,
      isActive: existing.isActive
    };
    
    // 佣金條件是方案池概念，不需要重疊檢查
    
    // 先刪除所有子表資料（簡單重建方式）
    await this.conditionGroupRepository.delete({ commissionConditionId: id });

    // 更新主檔
    await this.commissionConditionRepository.update(id, {
      name: dto.name,
      method: dto.method,
      isActive: dto.isActive,
      agentId: dto.agentId, // 修正：添加 agentId 更新
      systemType: dto.systemType,
      agentLevel: dto.agentLevel,
      commissionPercent: dto.commissionPercent,
      gameRebateRates: dto.gameRebateRates,
      settlementCycle: dto.settlementCycle,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    });

    // 重新建立群組（如果有提供）
    if (dto.groups) {
      for (let i = 0; i < dto.groups.length; i++) {
        const groupDto = dto.groups[i];
        const group = this.conditionGroupRepository.create({
          minRegistrations: groupDto.minRegistrations || 0,
          minActiveMembers: groupDto.minActiveMembers || 0,
          minValidBets: groupDto.minValidBets || 0,
          requireNegativeProfit: groupDto.requireNegativeProfit || false,
          minNetRevenue: groupDto.minNetRevenue?.toString() || '0',
          sharePercent: groupDto.sharePercent.toString(),
          agentRemitPercent: groupDto.agentRemitPercent.toString(),
          order: i + 1,
          commissionConditionId: id,
        });

        const savedGroup = await this.conditionGroupRepository.save(group);

        // 重建平台退水費率
        if (groupDto.platformRefundRates) {
          for (const rateDto of groupDto.platformRefundRates) {
            const rate = this.platformRefundRateRepository.create({
              platformCode: rateDto.platformCode,
              refundPercent: rateDto.refundPercent.toString(),
              conditionGroupId: savedGroup.id,
            });
            await this.platformRefundRateRepository.save(rate);
          }
        }

        // 重建固定費用
        if (groupDto.fixedCost) {
          const cost = this.fixedCostRepository.create({
            feeDeposit: groupDto.fixedCost.feeDeposit?.toString() || '0',
            feeWithdraw: groupDto.fixedCost.feeWithdraw?.toString() || '0',
            refundBudgetPercent: groupDto.fixedCost.refundBudgetPercent?.toString() || '0',
            promoBudgetPercent: groupDto.fixedCost.promoBudgetPercent?.toString() || '0',
            bonusBudgetPercent: groupDto.fixedCost.bonusBudgetPercent?.toString() || '0',
            conditionGroupId: savedGroup.id,
          });
          await this.fixedCostRepository.save(cost);
        }
      }
    }

    // 記錄審計日誌
    if (user) {
      try {
        const afterData = {
          id: id,
          name: dto.name,
          agentId: dto.agentId,
          method: dto.method,
          systemType: dto.systemType,
          agentLevel: dto.agentLevel,
          commissionPercent: dto.commissionPercent,
          gameRebateRates: dto.gameRebateRates,
          settlementCycle: dto.settlementCycle,
          isActive: dto.isActive
        };

        await this.auditLogService.record({
          user: user,
          action: `編輯分潤方案「${dto.name || existing.name}」`,
          ip: user.ip || 'Unknown',
          platform: user.platform || 'Web',
          target: `CommissionCondition:${id}`,
          before: beforeData,
          after: afterData,
        });
      } catch (auditError) {
        console.error('記錄審計日誌失敗:', auditError);
      }
    }

    return this.findOne(companyCode, id, user);
  }

  async patchStatus(companyCode: string, id: string, isActive: boolean, user?: any) {
    await this.findOne(companyCode, id, user); // 驗證存在和權限
    
    await this.commissionConditionRepository.update(id, { isActive });
    return this.findOne(companyCode, id, user);
  }

  async remove(companyCode: string, id: string, user?: any) {
    const condition = await this.findOne(companyCode, id, user);
    
    // 記錄刪除前的資料（用於審計日誌）
    const beforeData = {
      id: condition.id,
      name: condition.name,
      agentId: condition.agentId,
      method: condition.method,
      systemType: condition.systemType,
      agentLevel: condition.agentLevel,
      commissionPercent: condition.commissionPercent,
      gameRebateRates: condition.gameRebateRates,
      settlementCycle: condition.settlementCycle,
      isActive: condition.isActive
    };
    
    // 真正刪除記錄（硬刪除）
    // 由於設定了 CASCADE，相關的 condition_groups, platform_refund_rates, fixed_costs 也會被自動刪除
    await this.commissionConditionRepository.delete(id);
    
    // 記錄審計日誌
    if (user) {
      try {
        await this.auditLogService.record({
          user: user,
          action: `刪除分潤方案「${condition.name}」`,
          ip: user.ip || 'Unknown',
          platform: user.platform || 'Web',
          target: `CommissionCondition:${id}`,
          before: beforeData,
          after: null,
        });
      } catch (auditError) {
        console.error('記錄審計日誌失敗:', auditError);
      }
    }
    
    return { message: 'Commission condition deleted successfully' };
  }

  /**
   * 試算現有條件
   */
  async previewExistingCondition(
    companyCode: string,
    id: string,
    previewDto: PreviewCommissionDto,
  ): Promise<PreviewResultDto> {
    // 取得現有條件
    const condition = await this.findOne(companyCode, id);
    if (!condition) {
      throw new NotFoundException('Commission condition not found');
    }

    return this.calculatePreview(condition.groups, previewDto);
  }

  /**
   * 試算表單條件
   */
  async previewCondition(
    companyCode: string,
    conditionDto: CreateCommissionConditionDto,
    previewDto: PreviewCommissionDto,
  ): Promise<PreviewResultDto> {
    if (!conditionDto.groups || conditionDto.groups.length === 0) {
      return {
        success: false,
        reason: 'NO_GROUPS',
        message: '沒有設定任何條件組',
        suggestions: ['請先建立至少一個條件組']
      };
    }

    return this.calculatePreview(conditionDto.groups, previewDto);
  }

  /**
   * 核心試算邏輯
   */
  private async calculatePreview(
    groups: any[],
    previewDto: PreviewCommissionDto,
  ): Promise<PreviewResultDto> {
    // 依 order 排序條件組
    const sortedGroups = [...groups].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // 尋找匹配的條件組
    let matchedGroupIndex = -1;
    let matchedGroup: any = null;

    for (let i = 0; i < sortedGroups.length; i++) {
      const group = sortedGroups[i];
      
      // 檢查條件
      const meetsCriteria = 
        previewDto.registrations >= (group.minRegistrations || 0) &&
        previewDto.activeMembers >= (group.minActiveMembers || 0) &&
        previewDto.validBets >= (group.minValidBets || 0) &&
        previewDto.netRevenue >= (group.minNetRevenue || 0) &&
        (!group.requireNegativeProfit || previewDto.netRevenue < 0);

      if (meetsCriteria) {
        matchedGroupIndex = i;
        matchedGroup = group;
        break;
      }
    }

    // 沒有匹配的條件組
    if (matchedGroup === null) {
      return this.generateNoMatchResult(sortedGroups, previewDto);
    }

    // 計算結果
    const calculation = await this.calculateCommission(matchedGroup, previewDto);
    
    const result: PreviewResultDto = {
      success: true,
      matchedGroup: {
        groupIndex: matchedGroupIndex,
        groupName: `條件組 ${matchedGroupIndex + 1}`,
        conditions: {
          minRegistrations: matchedGroup.minRegistrations || 0,
          minActiveMembers: matchedGroup.minActiveMembers || 0,
          minValidBets: matchedGroup.minValidBets || 0,
          minNetRevenue: matchedGroup.minNetRevenue || 0,
          requireNegativeProfit: matchedGroup.requireNegativeProfit || false,
        }
      },
      calculation,
      preview: this.generatePreviewText(matchedGroupIndex, calculation),
    };

    return result;
  }

  /**
   * 計算佣金詳情
   */
  private async calculateCommission(
    group: any,
    previewDto: PreviewCommissionDto,
  ): Promise<CalculationResult> {
    // 計算平台退水
    const platformRefunds: PlatformRefund[] = [];
    let totalRefund = 0;

    if (group.platformRefundRates && group.platformRefundRates.length > 0) {
      for (const refundRate of group.platformRefundRates) {
        // 這裡簡化計算，實際可能需要依據平台實際投注額
        const refundAmount = Math.abs(previewDto.netRevenue) * (refundRate.refundPercent / 100);
        
        platformRefunds.push({
          platformCode: refundRate.platformCode,
          platformName: this.getPlatformName(refundRate.platformCode),
          refundRate: refundRate.refundPercent,
          refundAmount: Math.round(refundAmount),
        });
        
        totalRefund += refundAmount;
      }
    }

    // 計算基礎佣金 (淨輸贏的分潤比例)
    const baseCommission = Math.abs(previewDto.netRevenue) * (group.sharePercent / 100);
    
    // 計算代理上繳
    const agentRemit = baseCommission * (group.agentRemitPercent / 100);
    
    // 計算總佣金 (基礎佣金 - 平台退水)
    const totalCommission = Math.max(0, baseCommission - totalRefund);
    
    // 計算淨額 (總佣金 - 代理上繳 - 固定費用)
    const fixedCost = group.fixedCost || 0;
    const netAmount = Math.max(0, totalCommission - agentRemit - fixedCost);

    return {
      sharePercent: group.sharePercent || 0,
      agentRemitPercent: group.agentRemitPercent || 0,
      platformRefunds,
      fixedCost: fixedCost || 0,
      totalCommission: Math.round(totalCommission || 0),
      netAmount: Math.round(netAmount || 0),
    };
  }

  /**
   * 取得平台名稱
   */
  private getPlatformName(platformCode: string): string {
    const platformNames: Record<string, string> = {
      'AFB88': 'AFB體育',
      'DBG': 'DBG電子',
      'MT': 'MT棋牌',
      'SUPER': 'SUPER彩票',
      'DB539': 'DB539彩票',
      'R10': 'R10電子',
      'wgwin': 'WG真人',
      'wgwin539': 'WG539',
    };
    
    return platformNames[platformCode] || platformCode;
  }

  /**
   * 生成無匹配結果
   */
  private generateNoMatchResult(
    groups: any[],
    previewDto: PreviewCommissionDto,
  ): PreviewResultDto {
    const suggestions: string[] = [];
    
    if (groups.length > 0) {
      const firstGroup = groups[0];
      
      if (previewDto.registrations < (firstGroup.minRegistrations || 0)) {
        suggestions.push(`註冊人數需達 ${firstGroup.minRegistrations} 人`);
      }
      if (previewDto.activeMembers < (firstGroup.minActiveMembers || 0)) {
        suggestions.push(`活躍會員數需達 ${firstGroup.minActiveMembers} 人`);
      }
      if (previewDto.validBets < (firstGroup.minValidBets || 0)) {
        suggestions.push(`有效投注需達 ${firstGroup.minValidBets}`);
      }
      if (previewDto.netRevenue < (firstGroup.minNetRevenue || 0)) {
        suggestions.push(`淨輸贏需達 ${firstGroup.minNetRevenue}`);
      }
      if (firstGroup.requireNegativeProfit && previewDto.netRevenue >= 0) {
        suggestions.push(`需要負利潤 (淨輸贏 < 0)`);
      }
    }

    return {
      success: false,
      reason: 'NO_MATCH',
      message: '輸入條件不符合任何條件組',
      suggestions: suggestions.length > 0 ? suggestions : ['請檢查條件設定'],
    };
  }

  /**
   * 生成預覽文字
   */
  private generatePreviewText(
    groupIndex: number,
    calculation: CalculationResult,
  ): string {
    const sharePercent = calculation.sharePercent || 0;
    const agentRemitPercent = calculation.agentRemitPercent || 0;
    const totalCommission = calculation.totalCommission || 0;
    const netAmount = calculation.netAmount || 0;
    
    return `匹配第${groupIndex + 1}組條件，佣金${sharePercent}%，代理上繳${agentRemitPercent}%，總佣金 ${totalCommission.toLocaleString()}，實得 ${netAmount.toLocaleString()}`;
  }

  /**
   * 檢查重疊衝突
   */
  private async checkOverlapConflict(
    companyCode: string,
    checkDto: OverlapCheckDto,
  ): Promise<void> {

    const { agentId, effectiveFrom, effectiveTo, excludeId } = checkDto;
    
    // 獲取公司資訊
    const company = await this.companyRepository.findOne({
      where: { code: companyCode },
    });
    if (!company) {
      throw new NotFoundException(`Company not found: ${companyCode}`);
    }

    // 建立查詢條件
    const queryBuilder = this.commissionConditionRepository
      .createQueryBuilder('condition')
      .leftJoinAndSelect('condition.agent', 'agent')
      .where('condition.company_id = :companyId', { companyId: company.id })
      .andWhere('condition.isActive = :isActive', { isActive: true });

    // 排除自己 (更新時使用)
    if (excludeId) {
      queryBuilder.andWhere('condition.id != :excludeId', { excludeId });
    }

    // 代理商衝突檢查邏輯
    if (agentId === 0) {
      // 任意代理商與所有代理商都可能衝突
      // 不需要添加額外的 where 條件，查詢所有啟用的條件
    } else {
      // 特定代理商只需要檢查：
      // 1. 與同一代理商的衝突
      // 2. 與任意代理商(agentId=0)的衝突
      queryBuilder.andWhere(
        '(condition.agentId = :agentId OR condition.agentId = 0)',
        { agentId }
      );
    }

    const existingConditions = await queryBuilder.getMany();

    if (existingConditions.length === 0) {
      return;
    }

    // 檢查日期重疊
    const requestRange: [Date | null, Date | null] = [
      DateOverlapUtil.parseDate(effectiveFrom),
      DateOverlapUtil.parseDate(effectiveTo),
    ];

    const conflicts: ConflictCondition[] = [];
    const conflictRanges: Array<[Date | null, Date | null]> = [];

    for (const existing of existingConditions) {
      const existingRange: [Date | null, Date | null] = [
        DateOverlapUtil.parseDate(this.formatDateToString(existing.effectiveFrom)),
        DateOverlapUtil.parseDate(this.formatDateToString(existing.effectiveTo)),
      ];

      if (DateOverlapUtil.hasOverlap(requestRange, existingRange)) {
        conflicts.push({
          id: existing.id,
          name: existing.name,
          agentId: existing.agentId,
          agentName: existing.agentId === 0 ? '任意代理商' : existing.agent?.agent_name || `代理${existing.agentId}`,
          effectiveFrom: this.formatDateToString(existing.effectiveFrom),
          effectiveTo: this.formatDateToString(existing.effectiveTo),
          isActive: existing.isActive,
        });

        conflictRanges.push(existingRange);
      }
    }

    if (conflicts.length > 0) {
      // 計算重疊區間
      const overlapRange = DateOverlapUtil.getOverlapRange(requestRange, conflictRanges[0]);
      
      // 生成調整建議
      const suggestions = DateOverlapUtil.generateSuggestions(requestRange, conflictRanges);
      
      const overlapError: OverlapErrorDto = {
        success: false,
        error: 'OVERLAP_DETECTED',
        message: `代理商 ${agentId === 0 ? '任意代理' : agentId} 的有效期間與現有條件重疊`,
        conflictConditions: conflicts,
        suggestions,
        overlapDetails: {
          requestedFrom: effectiveFrom,
          requestedTo: effectiveTo,
          conflictStart: overlapRange ? DateOverlapUtil.formatDate(overlapRange[0]) : '未知',
          conflictEnd: overlapRange ? DateOverlapUtil.formatDate(overlapRange[1]) : '未知',
        },
      };

      throw new ConflictException(overlapError);
    }
  }

  /**
   * 檢查重疊 API (供前端主動檢查使用)
   */
  async checkOverlap(
    companyCode: string,
    checkDto: OverlapCheckDto,
  ): Promise<{ hasOverlap: boolean; conflicts?: ConflictCondition[]; suggestions?: string[] }> {
    try {
      await this.checkOverlapConflict(companyCode, checkDto);
      return { hasOverlap: false };
    } catch (error) {
      if (error instanceof ConflictException) {
        const overlapError = error.getResponse() as OverlapErrorDto;
        return {
          hasOverlap: true,
          conflicts: overlapError.conflictConditions,
          suggestions: overlapError.suggestions,
        };
      }
      throw error;
    }
  }

  /**
   * 安全地將日期轉換為字串格式
   */
  private formatDateToString(date: any): string | undefined {
    if (!date) return undefined;
    
    // 如果已經是字串，直接返回
    if (typeof date === 'string') {
      return date;
    }
    
    // 如果是Date對象，轉換為YYYY-MM-DD格式
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    // 嘗試解析為Date後再轉換
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (error) {
      // 無法解析日期時靜默處理
    }
    
    return undefined;
  }
}