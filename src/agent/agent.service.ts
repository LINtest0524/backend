import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { User, UserRole } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateAgentDto } from './dto/create-agent.dto';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  async create(dto: CreateAgentDto) {
    // 帳號重複檢查
    const exists = await this.userRepo.findOne({ where: { username: dto.loginAccount } });
    if (exists) throw new ConflictException('LOGIN_ACCOUNT_EXISTS');

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

    // 檢查聯絡資訊欄位是否存在
    const contactFields = await this.ds.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      AND column_name IN ('phone', 'email', 'telegram', 'line', 'qq', 'note')
      ORDER BY column_name
    `);
    const existingFields = contactFields.map(f => f.column_name);

    return await this.ds.transaction(async (tm) => {
      const userData: any = {
        company_id: dto.companyId,
        agent_level: dto.agentLevel,
        parent_agent_id: dto.parentAgentId ?? null,
        agent_name: dto.displayName,
        commission_condition_id: dto.commissionConditionId ?? null,
        status: dto.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        username: dto.loginAccount,
        password: passwordHash,
        role: dto.agentLevel === 1 ? UserRole.AGENT_LEVEL_1 :
              dto.agentLevel === 2 ? UserRole.AGENT_LEVEL_2 :
              dto.agentLevel === 3 ? UserRole.AGENT_LEVEL_3 :
              UserRole.AGENT_LEVEL_4,
      };

      // 只添加存在的欄位
      if (existingFields.includes('phone')) userData.phone = dto.phone ?? null;
      if (existingFields.includes('email')) userData.email = dto.email ?? null;
      if (existingFields.includes('telegram')) userData.telegram = dto.telegram ?? null;
      if (existingFields.includes('line')) userData.line = dto.line ?? null;
      if (existingFields.includes('qq')) userData.qq = dto.qq ?? null;
      if (existingFields.includes('note')) userData.note = dto.note ?? null;

      
      const user = tm.create(User, userData);
      const saved = await tm.save(user) as User;
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
          u.username,
          u.agent_level,
          u.parent_agent_id,
          u.status,
          u.phone,
          u.email,
          u.created_at,
          u.agent_code,
          c.name as company_name,
          c.code as company_code
        FROM "user" u
        LEFT JOIN company c ON u.company_id = c.id
        WHERE ${whereCondition}
        ORDER BY u.created_at DESC
      `, params);

      // 轉換為前端期望的格式
      return agents.map(agent => ({
        id: agent.id,
        agent_name: agent.agent_name,
        username: agent.username,
        agent_level: agent.agent_level,
        parent_agent_id: agent.parent_agent_id,
        status: agent.status,
        phone: agent.phone,
        email: agent.email,
        created_at: agent.created_at,
        agent_code: agent.agent_code,
        company: {
          name: agent.company_name,
          code: agent.company_code
        }
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
          u.username,
          u.agent_level,
          u.parent_agent_id,
          u.status,
          u.phone,
          u.email,
          u.created_at,
          u.agent_code,
          c.name as company_name,
          c.code as company_code,
          p.id as parent_id,
          p.agent_name as parent_agent_name,
          p.username as parent_username
        FROM "user" u
        LEFT JOIN company c ON u.company_id = c.id
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
        username: agent.username,
        agent_level: agent.agent_level,
        parent_agent_id: agent.parent_agent_id,
        status: agent.status,
        phone: agent.phone,
        email: agent.email,
        created_at: agent.created_at,
        agent_code: agent.agent_code,
        company: {
          name: agent.company_name,
          code: agent.company_code
        },
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
        display_name: agentData.agent_name,
        username: agentData.username,
        login_account: agentData.username,
        agent_level: agentData.agent_level,
        parent_agent_id: agentData.parent_agent_id,
        commission_condition_id: agentData.commission_condition_id || null,
        status: agentData.status,
        phone: agentData.phone || '',
        email: agentData.email || '',
        // 社交媒體和備註欄位（資料庫已支援）
        telegram: agentData.telegram || '',
        line: agentData.line || '',
        qq: agentData.qq || '',
        note: agentData.note || '',
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

  async update(id: number, updateData: any) {
    try {
      const existingAgent = await this.userRepo.findOne({ 
        where: { id },
        relations: ['company']
      });

      if (!existingAgent) {
        throw new Error('Agent not found');
      }

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
        updateFields.agent_name = updateData.displayName;
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

  async delete(id: number) {
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

      return { 
        id: id, 
        message: 'Agent deleted successfully',
        deletedAt: new Date() 
      };
    } catch (error) {
      throw error;
    }
  }
}