import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';

@Injectable()
export class AgentOptionsService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async levels() {
    // 先固定 1~3；未來可讀設定表
    return [1,2,3];
  }

  async statuses() {
    return ['active','inactive','pending'];
  }

  async companies() {
    // 使用 Repository 查詢
    const companies = await this.companyRepository.find({
      select: ['id', 'name', 'code'],
      order: { id: 'ASC' }
    });
    return companies;
  }

  async getUserCompany(companyId: number) {
    // 使用 Repository 查詢
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      select: ['id', 'name', 'code']
    });
    return company ? [company] : [];
  }

  async parentAgents(companyId: number) {
    try {
      console.log(`🔍 Loading all agents for company ${companyId}`);
      
      // 使用原生 SQL 查詢，確保正確篩選代理商角色
      const agents = await this.ds.query(`
        SELECT 
          u.id,
          u.agent_name,
          u.username,
          u.agent_level,
          u.role
        FROM "user" u
        WHERE u.company_id = $1 
          AND u.role IN ('AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
          AND u.deleted_at IS NULL
        ORDER BY u.agent_level ASC, u.id ASC
      `, [companyId]);
      
      console.log(`📊 Found ${agents.length} agents in database for company ${companyId}`);
      
      // 格式化回應，包含任意代理商選項
      const agentList = [
        {
          id: 0,
          displayName: '任意代理商',
          username: 'any',
          agentLevel: 0
        },
        ...agents.map(user => ({
          id: user.id,
          displayName: user.agent_name || user.username || `Agent ${user.id}`,
          username: user.username,
          agentLevel: user.agent_level
        }))
      ];
      
      console.log(`✅ Returning ${agentList.length} agents (including "任意代理商")`);
      console.log(`📋 Agent list:`, agentList.map(a => `${a.displayName} (Level ${a.agentLevel})`));
      
      return agentList;
    } catch (error) {
      console.error(`❌ Error loading parent agents:`, error);
      throw error;
    }
  }
}