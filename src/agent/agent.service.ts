import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { User, UserRole } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateAgentDto, currentUser?: User, ip: string = 'unknown') {
    // 帳號重複檢查
    const exists = await this.userRepo.findOne({ where: { username: dto.loginAccount } });
    if (exists) throw new ConflictException('LOGIN_ACCOUNT_EXISTS');

    // frontendUrl 格式和唯一性檢查
    if (dto.frontendUrl) {
      // 格式檢查：只允許英文、數字、連字符、底線
      const urlPattern = /^[a-zA-Z0-9_-]+$/;
      if (!urlPattern.test(dto.frontendUrl)) {
        throw new BadRequestException('FRONTEND_URL_INVALID_FORMAT');
      }

      // 長度檢查
      if (dto.frontendUrl.length > 50) {
        throw new BadRequestException('FRONTEND_URL_TOO_LONG');
      }

      // 同公司內唯一性檢查
      const urlExists = await this.ds.query(`
        SELECT id FROM "user" 
        WHERE company_id = $1 AND frontend_url = $2
      `, [dto.companyId, dto.frontendUrl]);
      
      if (urlExists.length > 0) {
        throw new ConflictException('FRONTEND_URL_EXISTS');
      }
    }

    // 父層檢查（同公司 & 層級小於子層）
    if (dto.parentAgentId) {
      const parent = await this.userRepo.findOne({ 
        where: { id: dto.parentAgentId },
        relations: ['company']
      });
      if (!parent) throw new BadRequestException('PARENT_NOT_FOUND');
      
      if (parent.company_id !== dto.companyId) {
        throw new BadRequestException('PARENT_COMPANY_MISMATCH');
      }
      if ((parent.agent_level ?? 0) >= dto.agentLevel) {
        throw new BadRequestException('PARENT_LEVEL_MUST_BE_LOWER');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 檢查欄位是否存在
    const contactFields = await this.ds.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      AND column_name IN ('phone', 'email', 'telegram', 'line', 'qq', 'note', 'frontend_url',
                           'gender', 'id_number', 'default_vip_level', 'default_rebate_settlement',
                           'default_payment_group', 'account_status', 'bank_cards', 'banned_game_providers')
      ORDER BY column_name
    `);
    const existingFields = contactFields.map(f => f.column_name);

    return await this.ds.transaction(async (tm) => {
      const userData: any = {
        company_id: dto.companyId,
        agent_level: dto.agentLevel,
        parent_agent_id: dto.parentAgentId ?? null,
        display_name: dto.displayName,
        agent_name: dto.agentName ?? null,
        commission_condition_id: dto.commissionConditionId ?? null,
        status: dto.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        username: dto.loginAccount,
        password: passwordHash,
        role: dto.agentLevel === 1 ? UserRole.AGENT_LEVEL_1 :
              dto.agentLevel === 2 ? UserRole.AGENT_LEVEL_2 :
              dto.agentLevel === 3 ? UserRole.AGENT_LEVEL_3 :
              UserRole.AGENT_LEVEL_4,
      };

      // 只添加存在的欄位 - 聯絡資訊
      if (existingFields.includes('phone')) userData.phone = dto.phone ?? null;
      if (existingFields.includes('email')) userData.email = dto.email ?? null;
      if (existingFields.includes('telegram')) userData.telegram = dto.telegram ?? null;
      if (existingFields.includes('line')) userData.line = dto.line ?? null;
      if (existingFields.includes('qq')) userData.qq = dto.qq ?? null;
      if (existingFields.includes('note')) userData.note = dto.note ?? null;
      if (existingFields.includes('frontend_url')) userData.frontend_url = dto.frontendUrl ?? null;
      
      // 代理資料
      if (existingFields.includes('gender')) userData.gender = dto.gender ?? null;
      if (existingFields.includes('id_number')) userData.id_number = dto.idNumber ?? null;
      
      // 預設設定
      if (existingFields.includes('default_vip_level')) userData.default_vip_level = dto.defaultVipLevel ?? 'VIP0';
      if (existingFields.includes('default_rebate_settlement')) userData.default_rebate_settlement = dto.defaultRebateSettlement ?? 'daily';
      if (existingFields.includes('default_payment_group')) userData.default_payment_group = dto.defaultPaymentGroup ?? 'regular';
      
      // JSON 欄位
      if (existingFields.includes('account_status')) userData.account_status = dto.accountStatus ?? ['normal'];
      if (existingFields.includes('bank_cards')) userData.bank_cards = dto.bankCards ?? [];
      if (existingFields.includes('banned_game_providers')) userData.banned_game_providers = dto.bannedGameProviders ?? null;

      
      const user = tm.create(User, userData);
      const saved = await tm.save(user) as User;
      
      // 記錄操作日誌
      if (currentUser) {
        await this.auditLogService.record({
          user: currentUser,
          action: '新增代理商',
          ip: ip,
          platform: '後台管理',
          target: `Agent:${saved.id}`,
          after: {
            id: saved.id,
            username: saved.username,
            agent_level: saved.agent_level,
            display_name: saved.display_name,
            agent_name: saved.agent_name,
            parent_agent_id: saved.parent_agent_id,
            company_id: saved.company_id,
            status: saved.status,
            commission_condition_id: saved.commission_condition_id,
          }
        });
      }
      
      return { 
        id: saved.id, 
        loginAccount: saved.username, 
        status: saved.status, 
        createdAt: saved.created_at 
      };
    });
  }

  async findAll(companyId?: number) {
    try {
      // 修正：對 enum 類型使用 IN 而不是 LIKE
      const whereCondition = companyId 
        ? `role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4') AND company_id = $1 AND deleted_at IS NULL`
        : `role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4') AND deleted_at IS NULL`;
      
      const params = companyId ? [companyId] : [];
      
      const agents = await this.ds.query(`
        SELECT 
          u.id,
          u.agent_name,
          u.display_name,
          u.username,
          u.agent_level,
          u.parent_agent_id,
          u.status,
          u.phone,
          u.email,
          u.created_at,
          u.last_login_at,
          u.agent_code,
          u.commission_condition_id,
          u.default_payment_group,
          u.default_rebate_settlement,
          c.name as company_name,
          c.code as company_code,
          cc.id as condition_id,
          cc.name as condition_name,
          cc."systemType" as condition_system_type,
          cc."commissionPercent" as condition_commission_percent,
          cc."gameRebateRates" as condition_game_rebate_rates,
          (SELECT COUNT(*) FROM "user" m WHERE m.parent_agent_id = u.id AND m.role = 'USER' AND m.deleted_at IS NULL) as member_count,
          (
            WITH RECURSIVE agent_tree AS (
              -- 起始節點：當前代理商
              SELECT id, agent_level, parent_agent_id
              FROM "user"
              WHERE id = u.id AND deleted_at IS NULL
              
              UNION ALL
              
              -- 遞迴查詢所有子代理
              SELECT child.id, child.agent_level, child.parent_agent_id
              FROM "user" child
              INNER JOIN agent_tree parent ON child.parent_agent_id = parent.id
              WHERE child.role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_LEVEL_5', 'AGENT_LEVEL_6', 'AGENT_LEVEL_7', 'AGENT_LEVEL_8', 'AGENT_LEVEL_9', 'AGENT_LEVEL_10', 'AGENT_LEVEL_11', 'AGENT_LEVEL_12')
                AND child.deleted_at IS NULL
            )
            SELECT COALESCE(MAX(agent_level), u.agent_level) FROM agent_tree
          ) as max_agent_level,
          (SELECT COUNT(*) FROM "user" WHERE parent_agent_id = u.id AND role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_LEVEL_5', 'AGENT_LEVEL_6', 'AGENT_LEVEL_7', 'AGENT_LEVEL_8', 'AGENT_LEVEL_9', 'AGENT_LEVEL_10', 'AGENT_LEVEL_11', 'AGENT_LEVEL_12') AND deleted_at IS NULL) as next_level_count
        FROM "user" u
        LEFT JOIN company c ON u.company_id = c.id
        LEFT JOIN commission_conditions cc ON u.commission_condition_id::uuid = cc.id
        WHERE ${whereCondition}
        ORDER BY u.created_at DESC
      `, params);

      // 轉換為前端期望的格式
      return agents.map(agent => ({
        id: agent.id,
        agent_name: agent.agent_name,
        display_name: agent.display_name,
        username: agent.username,
        agent_level: agent.agent_level,
        parent_agent_id: agent.parent_agent_id,
        status: agent.status,
        phone: agent.phone,
        email: agent.email,
        created_at: agent.created_at,
        last_login_at: agent.last_login_at,
        agent_code: agent.agent_code,
        member_count: parseInt(agent.member_count) || 0,
        max_agent_level: parseInt(agent.max_agent_level) || 0,
        next_level_count: parseInt(agent.next_level_count) || 0,
        default_payment_group: agent.default_payment_group,
        default_rebate_settlement: agent.default_rebate_settlement,
        company: {
          name: agent.company_name,
          code: agent.company_code
        },
        commission_condition: agent.condition_id ? {
          id: agent.condition_id,
          name: agent.condition_name,
          systemType: agent.condition_system_type,
          commissionPercent: agent.condition_commission_percent,
          gameRebateRates: agent.condition_game_rebate_rates
        } : null
      }));
    } catch (error) {
      throw error;
    }
  }

  async findAgentByUserId(userId: number, companyId: number) {
    return this.userRepo.findOne({
      where: [
        { id: userId, company_id: companyId, role: UserRole.AGENT_LEVEL_1, deleted_at: IsNull() },
        { id: userId, company_id: companyId, role: UserRole.AGENT_LEVEL_2, deleted_at: IsNull() },
        { id: userId, company_id: companyId, role: UserRole.AGENT_LEVEL_3, deleted_at: IsNull() },
        { id: userId, company_id: companyId, role: UserRole.AGENT_LEVEL_4, deleted_at: IsNull() }
      ],
      relations: ['company', 'parent_agent']
    });
  }

  async findAgentHierarchy(agentId: number, companyId: number) {
    try {
      // 遞歸查找所有下級代理商
      const getAllSubAgents = async (parentId: number): Promise<number[]> => {
        const subAgents = await this.userRepo.find({
          where: [
            { parent_agent_id: parentId, company_id: companyId, role: UserRole.AGENT_LEVEL_1, deleted_at: IsNull() },
            { parent_agent_id: parentId, company_id: companyId, role: UserRole.AGENT_LEVEL_2, deleted_at: IsNull() },
            { parent_agent_id: parentId, company_id: companyId, role: UserRole.AGENT_LEVEL_3, deleted_at: IsNull() },
            { parent_agent_id: parentId, company_id: companyId, role: UserRole.AGENT_LEVEL_4, deleted_at: IsNull() }
          ],
          select: ['id']
        });
        
        let allSubIds = subAgents.map(agent => agent.id);
        
        // 遞歸查找每個子代理的下級
        for (const subAgent of subAgents) {
          const subSubIds = await getAllSubAgents(subAgent.id);
          allSubIds = [...allSubIds, ...subSubIds];
        }
        
        return allSubIds;
      };

      const subAgentIds = await getAllSubAgents(agentId);
      const allVisibleIds = [agentId, ...subAgentIds];


      // 使用原生 SQL 查詢確保資料格式正確
      const agents = await this.ds.query(`
        SELECT 
          u.id,
          u.agent_name,
          u.display_name,
          u.username,
          u.agent_level,
          u.parent_agent_id,
          u.status,
          u.phone,
          u.email,
          u.created_at,
          u.last_login_at,
          u.agent_code,
          u.commission_condition_id,
          u.default_payment_group,
          u.default_rebate_settlement,
          c.name as company_name,
          c.code as company_code,
          cc.id as condition_id,
          cc.name as condition_name,
          cc."systemType" as condition_system_type,
          cc."commissionPercent" as condition_commission_percent,
          cc."gameRebateRates" as condition_game_rebate_rates,
          p.id as parent_id,
          p.agent_name as parent_agent_name,
          p.username as parent_username,
          (SELECT COUNT(*) FROM "user" m WHERE m.parent_agent_id = u.id AND m.role = 'USER' AND m.deleted_at IS NULL) as member_count,
          (
            WITH RECURSIVE agent_tree AS (
              -- 起始節點：當前代理商
              SELECT id, agent_level, parent_agent_id
              FROM "user"
              WHERE id = u.id AND deleted_at IS NULL
              
              UNION ALL
              
              -- 遞迴查詢所有子代理
              SELECT child.id, child.agent_level, child.parent_agent_id
              FROM "user" child
              INNER JOIN agent_tree parent ON child.parent_agent_id = parent.id
              WHERE child.role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_LEVEL_5', 'AGENT_LEVEL_6', 'AGENT_LEVEL_7', 'AGENT_LEVEL_8', 'AGENT_LEVEL_9', 'AGENT_LEVEL_10', 'AGENT_LEVEL_11', 'AGENT_LEVEL_12')
                AND child.deleted_at IS NULL
            )
            SELECT COALESCE(MAX(agent_level), u.agent_level) FROM agent_tree
          ) as max_agent_level,
          (SELECT COUNT(*) FROM "user" WHERE parent_agent_id = u.id AND role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_LEVEL_5', 'AGENT_LEVEL_6', 'AGENT_LEVEL_7', 'AGENT_LEVEL_8', 'AGENT_LEVEL_9', 'AGENT_LEVEL_10', 'AGENT_LEVEL_11', 'AGENT_LEVEL_12') AND deleted_at IS NULL) as next_level_count
        FROM "user" u
        LEFT JOIN company c ON u.company_id = c.id
        LEFT JOIN commission_conditions cc ON u.commission_condition_id::uuid = cc.id
        LEFT JOIN "user" p ON u.parent_agent_id = p.id
        WHERE u.role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
          AND u.id = ANY($1::int[])
          AND u.company_id = $2
          AND u.deleted_at IS NULL
        ORDER BY u.agent_level ASC, u.created_at DESC
      `, [allVisibleIds, companyId]);


      // 轉換為前端期望的格式
      return agents.map(agent => ({
        id: agent.id,
        agent_name: agent.agent_name,
        display_name: agent.display_name,
        username: agent.username,
        agent_level: agent.agent_level,
        parent_agent_id: agent.parent_agent_id,
        status: agent.status,
        phone: agent.phone,
        email: agent.email,
        created_at: agent.created_at,
        last_login_at: agent.last_login_at,
        agent_code: agent.agent_code,
        member_count: parseInt(agent.member_count) || 0,
        max_agent_level: parseInt(agent.max_agent_level) || 0,
        next_level_count: parseInt(agent.next_level_count) || 0,
        default_payment_group: agent.default_payment_group,
        default_rebate_settlement: agent.default_rebate_settlement,
        company: {
          name: agent.company_name,
          code: agent.company_code
        },
        commission_condition: agent.condition_id ? {
          id: agent.condition_id,
          name: agent.condition_name,
          systemType: agent.condition_system_type,
          commissionPercent: agent.condition_commission_percent,
          gameRebateRates: agent.condition_game_rebate_rates
        } : null,
        parent_agent: agent.parent_id ? {
          id: agent.parent_id,
          agent_name: agent.parent_agent_name,
          username: agent.parent_username
        } : null
      }));
    } catch (error) {
      throw error;
    }
  }

  async findById(id: number) {
    try {
      const agent = await this.ds.query(`
        SELECT *
        FROM "user" u
        LEFT JOIN company c ON u.company_id = c.id
        WHERE u.id = $1 AND u.role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4') AND u.deleted_at IS NULL
      `, [id]);

      if (!agent || agent.length === 0) {
        throw new Error('Agent not found');
      }

      const agentData = agent[0];
      
      const result = {
        id: agentData.id,
        agent_name: agentData.agent_name,
        display_name: agentData.display_name,
        username: agentData.username,
        login_account: agentData.username,
        agent_level: agentData.agent_level,
        parent_agent_id: agentData.parent_agent_id,
        commission_condition_id: agentData.commission_condition_id || null,
        status: agentData.status,
        phone: agentData.phone || '',
        email: agentData.email || '',
        // 社交媒體和備註欄位
        telegram: agentData.telegram || '',
        line: agentData.line || '',
        qq: agentData.qq || '',
        note: agentData.note || '',
        // 代理前台網址
        frontend_url: agentData.frontend_url || '',
        frontendUrl: agentData.frontend_url || '',
        // 代理資料
        gender: agentData.gender || null,
        id_number: agentData.id_number || '',
        idNumber: agentData.id_number || '',
        // 預設設定
        default_vip_level: agentData.default_vip_level || 'VIP0',
        defaultVipLevel: agentData.default_vip_level || 'VIP0',
        default_rebate_settlement: agentData.default_rebate_settlement || 'daily',
        defaultRebateSettlement: agentData.default_rebate_settlement || 'daily',
        default_payment_group: agentData.default_payment_group || 'regular',
        defaultPaymentGroup: agentData.default_payment_group || 'regular',
        // JSON 欄位
        account_status: agentData.account_status || ['normal'],
        accountStatus: agentData.account_status || ['normal'],
        bank_cards: agentData.bank_cards || [],
        bankCards: agentData.bank_cards || [],
        banned_game_providers: agentData.banned_game_providers || null,
        bannedGameProviders: agentData.banned_game_providers || null,
        company_id: agentData.company_id,
        created_at: agentData.created_at,
        agent_code: agentData.agent_code || '',
        // 修正 company 資料的取得方式（JOIN 後的欄位名稱）
        company: {
          name: agentData.name || '',  // company.name
          code: agentData.code || ''   // company.code
        }
      };
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number, updateData: any, currentUser?: User, ip: string = 'unknown') {
    try {
      const existingAgent = await this.userRepo.findOne({ 
        where: { id },
        relations: ['company']
      });

      if (!existingAgent) {
        throw new Error('Agent not found');
      }
      
      // 保存修改前的資料（用於記錄）
      const beforeData = {
        agent_level: existingAgent.agent_level,
        display_name: existingAgent.display_name,
        agent_name: existingAgent.agent_name,
        parent_agent_id: existingAgent.parent_agent_id,
        status: existingAgent.status,
        commission_condition_id: existingAgent.commission_condition_id,
        phone: existingAgent.phone,
        email: existingAgent.email,
        default_payment_group: existingAgent.default_payment_group,
      };

      // 準備更新數據
      const updateFields: any = {};

      if (updateData.companyId !== undefined) {
        updateFields.company_id = updateData.companyId;
      }
      if (updateData.agentLevel !== undefined) {
        updateFields.agent_level = updateData.agentLevel;
        // 根據層級設定角色
        updateFields.role = updateData.agentLevel === 1 ? UserRole.AGENT_LEVEL_1 :
                           updateData.agentLevel === 2 ? UserRole.AGENT_LEVEL_2 :
                           updateData.agentLevel === 3 ? UserRole.AGENT_LEVEL_3 :
                           UserRole.AGENT_LEVEL_4;
      }
      if (updateData.parentAgentId !== undefined) {
        updateFields.parent_agent_id = updateData.parentAgentId;
      }
      if (updateData.displayName !== undefined) {
        updateFields.display_name = updateData.displayName;
      }
      if (updateData.commissionConditionId !== undefined) {
        updateFields.commission_condition_id = updateData.commissionConditionId;
      }
      if (updateData.phone !== undefined) {
        updateFields.phone = updateData.phone;
      }
      if (updateData.email !== undefined) {
        updateFields.email = updateData.email;
      }
      // 社交媒體欄位更新（資料庫已支援）
      if (updateData.telegram !== undefined) {
        updateFields.telegram = updateData.telegram;
      }
      if (updateData.line !== undefined) {
        updateFields.line = updateData.line;
      }
      if (updateData.qq !== undefined) {
        updateFields.qq = updateData.qq;
      }
      if (updateData.status !== undefined) {
        updateFields.status = updateData.status === 'active' ? 'ACTIVE' : 'INACTIVE';
      }
      // 登入帳號不允許修改
      // if (updateData.loginAccount !== undefined) {
      //   // 檢查帳號是否已存在（排除自己）
      //   const existingUser = await this.userRepo.findOne({ 
      //     where: { username: updateData.loginAccount } 
      //   });
      //   if (existingUser && existingUser.id !== id) {
      //     throw new ConflictException('LOGIN_ACCOUNT_EXISTS');
      //   }
      //   updateFields.username = updateData.loginAccount;
      // }
      // 密碼更新（僅允許超級管理員和全域管理員）
      if (updateData.password !== undefined && updateData.password.trim() !== '') {
        updateFields.password = await bcrypt.hash(updateData.password, 12);
      }
      // note 欄位更新（資料庫已支援）
      if (updateData.note !== undefined) {
        updateFields.note = updateData.note;
      }
      
      // frontendUrl 欄位更新
      if (updateData.frontendUrl !== undefined) {
        updateFields.frontend_url = updateData.frontendUrl;
      }
      
      // 代理資料欄位
      if (updateData.agentName !== undefined) {
        updateFields.agent_name = updateData.agentName;
      }
      if (updateData.gender !== undefined) {
        updateFields.gender = updateData.gender;
      }
      if (updateData.idNumber !== undefined) {
        updateFields.id_number = updateData.idNumber;
      }
      
      // 預設設定欄位
      if (updateData.defaultVipLevel !== undefined) {
        updateFields.default_vip_level = updateData.defaultVipLevel;
      }
      if (updateData.defaultRebateSettlement !== undefined) {
        updateFields.default_rebate_settlement = updateData.defaultRebateSettlement;
      }
      if (updateData.defaultPaymentGroup !== undefined) {
        updateFields.default_payment_group = updateData.defaultPaymentGroup;
      }
      
      // JSON 欄位
      if (updateData.accountStatus !== undefined) {
        updateFields.account_status = updateData.accountStatus;
      }
      if (updateData.bankCards !== undefined) {
        updateFields.bank_cards = updateData.bankCards;
      }
      if (updateData.bannedGameProviders !== undefined) {
        updateFields.banned_game_providers = updateData.bannedGameProviders;
      }

      // 父層檢查（如果有更新父層或層級）
      if (updateData.parentAgentId && (updateData.companyId || updateData.agentLevel)) {
        const parent = await this.userRepo.findOne({ 
          where: { id: updateData.parentAgentId },
          relations: ['company']
        });
        if (!parent) {
          throw new BadRequestException('PARENT_NOT_FOUND');
        }
        
        const companyId = updateData.companyId || existingAgent.company_id;
        const agentLevel = updateData.agentLevel || existingAgent.agent_level;
        
        if (parent.company_id !== companyId) {
          throw new BadRequestException('PARENT_COMPANY_MISMATCH');
        }
        if ((parent.agent_level ?? 0) >= agentLevel) {
          throw new BadRequestException('PARENT_LEVEL_MUST_BE_LOWER');
        }
      }

      // 執行更新
      await this.userRepo.update(id, updateFields);

      // 返回更新後的資料
      const updatedAgent = await this.findById(id);
      
      // 記錄操作日誌
      if (currentUser && Object.keys(updateFields).length > 0) {
        // 擴展 beforeData 和 afterData 包含所有可能變更的欄位
        const beforeData = {
          agent_level: existingAgent.agent_level,
          display_name: existingAgent.display_name,
          agent_name: existingAgent.agent_name,
          parent_agent_id: existingAgent.parent_agent_id,
          status: existingAgent.status,
          commission_condition_id: existingAgent.commission_condition_id,
          phone: existingAgent.phone,
          email: existingAgent.email,
          telegram: existingAgent.telegram,
          line: existingAgent.line,
          qq: existingAgent.qq,
          note: existingAgent.note,
          frontend_url: existingAgent.frontend_url,
          gender: existingAgent.gender,
          id_number: existingAgent.id_number,
          default_vip_level: existingAgent.default_vip_level,
          default_rebate_settlement: existingAgent.default_rebate_settlement,
          default_payment_group: existingAgent.default_payment_group,
          account_status: existingAgent.account_status,
          bank_cards: existingAgent.bank_cards,
          banned_game_providers: existingAgent.banned_game_providers,
        };
        
        const afterData = {
          agent_level: updatedAgent.agent_level,
          display_name: updatedAgent.display_name,
          agent_name: updatedAgent.agent_name,
          parent_agent_id: updatedAgent.parent_agent_id,
          status: updatedAgent.status?.toUpperCase() || updatedAgent.status,
          commission_condition_id: updatedAgent.commission_condition_id,
          phone: updatedAgent.phone,
          email: updatedAgent.email,
          telegram: updatedAgent.telegram,
          line: updatedAgent.line,
          qq: updatedAgent.qq,
          note: updatedAgent.note,
          frontend_url: updatedAgent.frontendUrl,
          gender: updatedAgent.gender,
          id_number: updatedAgent.idNumber,
          default_vip_level: updatedAgent.defaultVipLevel,
          default_rebate_settlement: updatedAgent.defaultRebateSettlement,
          default_payment_group: updatedAgent.defaultPaymentGroup,
          account_status: updatedAgent.accountStatus,
          bank_cards: updatedAgent.bankCards,
          banned_game_providers: updatedAgent.bannedGameProviders,
        };
        
        // 🔹 智能檢查變更類型並生成詳細的操作描述
        let action = '編輯代理商資料';
        const changedFields: string[] = [];
        
        // 輔助函數：正規化空值比較（null, undefined, '' 都視為相同）
        const normalizeEmpty = (val: any): any => {
          if (val === null || val === undefined || val === '') return null;
          return val;
        };
        const isChanged = (before: any, after: any): boolean => {
          return normalizeEmpty(before) !== normalizeEmpty(after);
        };
        
        // 狀態變更（優先級最高）
        if (updateFields.status !== undefined && beforeData.status !== afterData.status) {
          action = afterData.status === 'ACTIVE' ? '啟用代理商' : '停用代理商';
        } else {
          // 收集所有變更的欄位（只記錄真正有變化的）
          if (updateFields.agent_name !== undefined && isChanged(beforeData.agent_name, afterData.agent_name)) {
            changedFields.push(`代理姓名：${beforeData.agent_name || '空'} → ${afterData.agent_name || '空'}`);
          }
          if (updateFields.display_name !== undefined && isChanged(beforeData.display_name, afterData.display_name)) {
            changedFields.push(`顯示名稱：${beforeData.display_name || '空'} → ${afterData.display_name || '空'}`);
          }
          if (updateFields.gender !== undefined && isChanged(beforeData.gender, afterData.gender)) {
            const genderMap: Record<string, string> = { 
              'male': '男', 'MALE': '男',
              'female': '女', 'FEMALE': '女',
              'other': '其他', 'OTHER': '其他'
            };
            const beforeGender = beforeData.gender ? (genderMap[beforeData.gender] || beforeData.gender) : '未設定';
            const afterGender = afterData.gender ? (genderMap[afterData.gender] || afterData.gender) : '未設定';
            changedFields.push(`性別：${beforeGender} → ${afterGender}`);
          }
          if (updateFields.id_number !== undefined && isChanged(beforeData.id_number, afterData.id_number)) {
            changedFields.push(`身份證號：${beforeData.id_number || '空'} → ${afterData.id_number || '空'}`);
          }
          if (updateFields.phone !== undefined && isChanged(beforeData.phone, afterData.phone)) {
            changedFields.push(`電話：${beforeData.phone || '空'} → ${afterData.phone || '空'}`);
          }
          if (updateFields.email !== undefined && isChanged(beforeData.email, afterData.email)) {
            changedFields.push(`Email：${beforeData.email || '空'} → ${afterData.email || '空'}`);
          }
          if (updateFields.telegram !== undefined && isChanged(beforeData.telegram, afterData.telegram)) {
            changedFields.push(`Telegram：${beforeData.telegram || '空'} → ${afterData.telegram || '空'}`);
          }
          if (updateFields.line !== undefined && isChanged(beforeData.line, afterData.line)) {
            changedFields.push(`LINE：${beforeData.line || '空'} → ${afterData.line || '空'}`);
          }
          if (updateFields.qq !== undefined && isChanged(beforeData.qq, afterData.qq)) {
            changedFields.push(`QQ：${beforeData.qq || '空'} → ${afterData.qq || '空'}`);
          }
          if (updateFields.note !== undefined && isChanged(beforeData.note, afterData.note)) {
            changedFields.push(`備註：${beforeData.note || '空'} → ${afterData.note || '空'}`);
          }
          if (updateFields.frontend_url !== undefined && isChanged(beforeData.frontend_url, afterData.frontend_url)) {
            changedFields.push(`前台網址：${beforeData.frontend_url || '空'} → ${afterData.frontend_url || '空'}`);
          }
          if (updateFields.commission_condition_id !== undefined && isChanged(beforeData.commission_condition_id, afterData.commission_condition_id)) {
            changedFields.push(`分潤條件`);
          }
          if (updateFields.agent_level !== undefined && isChanged(beforeData.agent_level, afterData.agent_level)) {
            changedFields.push(`代理層級：${beforeData.agent_level} → ${afterData.agent_level}`);
          }
          if (updateFields.parent_agent_id !== undefined && isChanged(beforeData.parent_agent_id, afterData.parent_agent_id)) {
            // 查詢上級代理資訊以顯示完整名稱
            let beforeParentDisplay = '無';
            let afterParentDisplay = '無';
            
            if (beforeData.parent_agent_id) {
              const beforeParent = await this.userRepo.findOne({ where: { id: beforeData.parent_agent_id } });
              if (beforeParent) {
                beforeParentDisplay = beforeParent.agent_name ? `${beforeParent.username}(${beforeParent.agent_name})` : beforeParent.username;
              }
            }
            
            if (afterData.parent_agent_id) {
              const afterParent = await this.userRepo.findOne({ where: { id: afterData.parent_agent_id } });
              if (afterParent) {
                afterParentDisplay = afterParent.agent_name ? `${afterParent.username}(${afterParent.agent_name})` : afterParent.username;
              }
            }
            
            changedFields.push(`上級代理：${beforeParentDisplay} 跳線→ ${afterParentDisplay}`);
          }
          if (updateFields.default_vip_level !== undefined && isChanged(beforeData.default_vip_level, afterData.default_vip_level)) {
            changedFields.push(`預設VIP等級：${beforeData.default_vip_level} → ${afterData.default_vip_level}`);
          }
          if (updateFields.default_rebate_settlement !== undefined && isChanged(beforeData.default_rebate_settlement, afterData.default_rebate_settlement)) {
            const settlementMap: Record<string, string> = { 'daily': '每日', 'weekly': '每週', 'monthly': '每月' };
            const beforeSettlement = beforeData.default_rebate_settlement ? (settlementMap[beforeData.default_rebate_settlement] || beforeData.default_rebate_settlement) : '未設定';
            const afterSettlement = afterData.default_rebate_settlement ? (settlementMap[afterData.default_rebate_settlement] || afterData.default_rebate_settlement) : '未設定';
            changedFields.push(`預設返水結算：${beforeSettlement} → ${afterSettlement}`);
          }
          if (updateFields.default_payment_group !== undefined && isChanged(beforeData.default_payment_group, afterData.default_payment_group)) {
            changedFields.push(`預設支付群組：${beforeData.default_payment_group} → ${afterData.default_payment_group}`);
          }
          if (updateFields.account_status !== undefined && JSON.stringify(beforeData.account_status) !== JSON.stringify(afterData.account_status)) {
            changedFields.push(`帳號狀態`);
          }
          if (updateFields.bank_cards !== undefined && JSON.stringify(beforeData.bank_cards) !== JSON.stringify(afterData.bank_cards)) {
            changedFields.push(`銀行卡資料`);
          }
          if (updateFields.banned_game_providers !== undefined) {
            // 詳細比較遊戲廠商禁止狀態
            const beforeBanned = beforeData.banned_game_providers || {};
            const afterBanned = afterData.banned_game_providers || {};
            
            const categoryMap: Record<string, string> = {
              'live': '真人',
              'slot': '老虎機',
              'sports': '體育',
              'lottery': '彩票',
              'card': '棋牌',
              'fishing': '捕魚'
            };
            
            const changes: string[] = [];
            
            // 檢查每個類別的變化
            for (const [category, categoryName] of Object.entries(categoryMap)) {
              const beforeCat = beforeBanned[category] || { enabled: false, providers: [] };
              const afterCat = afterBanned[category] || { enabled: false, providers: [] };
              
              // 如果啟用狀態改變或廠商列表改變
              if (beforeCat.enabled !== afterCat.enabled || JSON.stringify(beforeCat.providers) !== JSON.stringify(afterCat.providers)) {
                if (afterCat.enabled) {
                  // 禁止了該類別
                  if (afterCat.providers && afterCat.providers.length > 0) {
                    // 禁止特定廠商
                    changes.push(`${categoryName}(${afterCat.providers.join('、')})`);
                  } else {
                    // 禁止整個類別
                    changes.push(`${categoryName}(全部)`);
                  }
                } else if (beforeCat.enabled) {
                  // 取消禁止
                  changes.push(`${categoryName}(已解除)`);
                }
              }
            }
            
            if (changes.length > 0) {
              changedFields.push(`禁止遊戲廠商：${changes.join('、')}`);
            }
          }
          if (updateFields.password !== undefined) {
            changedFields.push(`密碼`);
          }
          
          // 生成詳細的操作描述
          if (changedFields.length > 0) {
            const displayName = updatedAgent.agent_name ? `${updatedAgent.username}(${updatedAgent.agent_name})` : updatedAgent.username;
            action = `編輯代理商 - ${displayName}（${changedFields.join('、')}）`;
          }
        }
        
        await this.auditLogService.record({
          user: currentUser,
          action: action,
          ip: ip,
          platform: '後台管理',
          target: `Agent:${id}`,
          before: beforeData,
          after: afterData,
        });
      }
      
      return { 
        id: updatedAgent.id, 
        loginAccount: updatedAgent.username, 
        status: updatedAgent.status, 
        updatedAt: new Date() 
      };
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number, currentUser?: User, ip: string = 'unknown') {
    try {
      const existingAgent = await this.userRepo.findOne({ 
        where: { id },
        relations: ['company']
      });

      if (!existingAgent) {
        throw new Error('Agent not found');
      }

      // 檢查是否有下級代理商（未被刪除的）
      const childAgents = await this.userRepo.find({
        where: { parent_agent_id: id, deleted_at: IsNull() }
      });

      if (childAgents.length > 0) {
        throw new Error('Cannot delete agent with subordinates. Please reassign or delete subordinates first.');
      }

      // 軟刪除（設置 deleted_at）
      await this.userRepo.update(id, {
        deleted_at: new Date()
      });
      
      // 記錄操作日誌
      if (currentUser) {
        await this.auditLogService.record({
          user: currentUser,
          action: '刪除代理商',
          ip: ip,
          platform: '後台管理',
          target: `Agent:${id}`,
          before: {
            id: existingAgent.id,
            username: existingAgent.username,
            agent_level: existingAgent.agent_level,
            display_name: existingAgent.display_name,
            agent_name: existingAgent.agent_name,
            status: existingAgent.status,
          },
        });
      }

      return { 
        id: id, 
        message: 'Agent deleted successfully',
        deletedAt: new Date() 
      };
    } catch (error) {
      throw error;
    }
  }

  async findBySubdomain(companyCode: string, subdomain: string) {
    
    // 首先根據 companyCode 找到公司 ID
    const companyQuery = `
      SELECT id FROM "company" 
      WHERE LOWER(code) = LOWER($1)
    `;
    const companyResult = await this.ds.query(companyQuery, [companyCode]);
    
    if (companyResult.length === 0) {
      throw new BadRequestException('Company not found');
    }
    
    const companyId = companyResult[0].id;
    

    try {
      // 先執行調試查詢看看實際資料，不包含可能不存在的欄位
      const debugQuery = `
        SELECT id, username, frontend_url, status, role, agent_name, deleted_at
        FROM "user" 
        WHERE company_id = $1 
        ORDER BY id DESC
        LIMIT 5
      `;
      const debugResult = await this.ds.query(debugQuery, [companyId]);
    } catch (debugError) {
    }

    // 根據公司 ID 和前端 URL 查找代理商
    const agentQuery = `
      SELECT 
        id,
        agent_name,
        agent_level,
        status,
        frontend_url,
        company_id,
        username
      FROM "user" 
      WHERE company_id = $1 
        AND frontend_url = $2 
        AND status = 'ACTIVE'
        AND role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
        AND deleted_at IS NULL
    `;
    
    const agentResult = await this.ds.query(agentQuery, [companyId, subdomain]);
    
    if (agentResult.length === 0) {
      return null;
    }
    
    return agentResult[0];
  }
}