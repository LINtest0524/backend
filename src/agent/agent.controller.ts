import { Body, Controller, Get, Post, Put, Delete, Param, Query, UseGuards, Request, BadRequestException, NotFoundException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { Public } from '../auth/permission.decorator';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentService } from './agent.service';
import { AgentOptionsService } from './agent.options';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequirePermission } from '../auth/permission.decorator';

@Controller('agents')
export class AgentController {
  constructor(
    private readonly service: AgentService,
    private readonly options: AgentOptionsService,
  ) {}

  @RequirePermission('agents.create')
  @Post()
  async create(@Body() dto: CreateAgentDto, @Request() req: any) {
    const user = req.user;
    console.log(`🔍 Create agent called by user: ${user.username} (${user.role})`);
    
    try {
      const result = await this.service.create(dto, user, req.ip || 'unknown');
      console.log(`✅ Agent created successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error creating agent:`, error);
      throw error;
    }
  }

  @RequirePermission('agents.view')
  @Get()
  async findAll(@Request() req: any, @Query('companyId') companyId?: string) {
    const user = req.user;
    
    // 如果是 SUPER_ADMIN 或 GLOBAL_ADMIN，可以查看所有公司的代理商
    if (['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role)) {
      return this.service.findAll(companyId ? Number(companyId) : undefined);
    }
    
    // 代理商只能查看自己和下級的代理商
    const userCompanyId = user.company_id || user.companyId;
    if (!userCompanyId) {
      throw new Error('User company not found');
    }
    
    // 調試資訊
    
    // 找到當前用戶對應的代理商記錄
    const currentAgent = await this.service.findAgentByUserId(user.id, userCompanyId);
    
    if (!currentAgent) {
      // 如果不是代理商，只能看自己公司的所有代理商（可能是一般管理員）
      console.log(`⚠️ 用戶不是代理商，返回公司所有代理商`);
      return this.service.findAll(userCompanyId);
    }
    
    // 代理商只能看到自己和下級
    return this.service.findAgentHierarchy(currentAgent.id, userCompanyId);
  }

  @RequirePermission('agents.view')
  @Get('options/levels')
  async levels() { return this.options.levels(); }

  @RequirePermission('agents.view')
  @Get('options/statuses')
  async statuses() { return this.options.statuses(); }

  @RequirePermission('agents.view')
  @Get('options/companies')
  async companies(@Request() req: any) { 
    const user = req.user;
    
    try {
      // 如果是 SUPER_ADMIN 或 GLOBAL_ADMIN，可以查看所有公司
      if (['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role)) {
        const result = await this.options.companies();
        return result;
      }
      
      // 代理商只能查看自己的公司
      const userCompanyId = user.company_id || user.companyId;
      
      if (!userCompanyId) {
        return [];
      }
      
      const result = await this.options.getUserCompany(userCompanyId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @RequirePermission('agents.view')
  @Get('options/parents')
  async parents(@Query('companyId') companyId: string, @Request() req: any) {
    const companyIdNum = Number(companyId);
    if (!companyId || isNaN(companyIdNum)) {
      throw new Error('Invalid companyId parameter');
    }
    
    try {
      const user = req.user;
      
      // 如果是 SUPER_ADMIN 或 GLOBAL_ADMIN，可以看到所有代理商
      if (['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role)) {
        const result = await this.options.parentAgents(companyIdNum);
        return result;
      }
      
      // 代理商只能看到自己和下級的代理商
      const userCompanyId = user.company_id || user.companyId;
      
      // 檢查公司權限
      if (userCompanyId !== companyIdNum) {
        console.log(`❌ Company access denied: user company ${userCompanyId} != requested ${companyIdNum}`);
        return []; // 沒有權限查看其他公司的代理商
      }
      
      // 找到當前用戶對應的代理商記錄
      const currentAgent = await this.service.findAgentByUserId(user.id, userCompanyId);
      
      if (!currentAgent) {
        console.log(`⚠️ User is not an agent, returning limited results`);
        // 如果不是代理商，只返回任意代理商選項
        return [{ id: 0, displayName: '任意代理商', username: 'any', agentLevel: 0 }];
      }
      
      // 代理商可以看到自己和下級的代理商
      console.log(`🔒 Agent user - fetching agent hierarchy for agent ${currentAgent.id}`);
      const hierarchyAgents = await this.service.findAgentHierarchy(currentAgent.id, userCompanyId);
      
      // 轉換為 parent agents 格式，並添加任意代理商選項
      const parentAgents = [
        { id: 0, displayName: '任意代理商', username: 'any', agentLevel: 0 },
        ...hierarchyAgents.map(agent => ({
          id: agent.id,
          displayName: agent.agent_name || agent.username,
          username: agent.username,
          agentLevel: agent.agent_level,
        }))
      ];
      
      console.log(`✅ Found ${parentAgents.length} parent agents for agent (including self and subordinates)`);
      return parentAgents;
      
    } catch (error) {
      console.error(`❌ Error loading parent agents:`, error);
      throw error;
    }
  }

  @RequirePermission('agents.manage')
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    const user = req.user;
    const agentId = Number(id);
    
    if (isNaN(agentId)) {
      throw new Error('Invalid agent ID');
    }
    
    
    try {
      // 如果是超級管理員或全域管理員，可以編輯所有欄位
      if (['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role)) {
        const result = await this.service.update(agentId, dto, user, req.ip || 'unknown');
        return result;
      }
      
      // 代理商權限檢查
      const userCompanyId = user.company_id || user.companyId;
      if (!userCompanyId) {
        throw new Error('User company not found');
      }
      
      // 找到當前用戶對應的代理商記錄
      const currentAgent = await this.service.findAgentByUserId(user.id, userCompanyId);
      if (!currentAgent) {
        throw new Error('Current user is not an agent');
      }
      
      // 檢查目標代理商是否在當前代理商的層級範圍內
      const hierarchyAgents = await this.service.findAgentHierarchy(currentAgent.id, userCompanyId);
      const allowedAgentIds = hierarchyAgents.map(agent => agent.id);
      
      if (!allowedAgentIds.includes(agentId)) {
        throw new Error('No permission to edit this agent');
      }
      
      // 代理商只能編輯聯絡資訊欄位
      const allowedFields = ['phone', 'email', 'telegram', 'line', 'qq'];
      const filteredDto = {};
      
      for (const field of allowedFields) {
        if (dto[field] !== undefined) {
          filteredDto[field] = dto[field];
        }
      }
      
      // 檢查是否有非允許的欄位
      const providedFields = Object.keys(dto);
      const unauthorizedFields = providedFields.filter(field => !allowedFields.includes(field));
      
      const result = await this.service.update(agentId, filteredDto, user, req.ip || 'unknown');
      return result;
      
    } catch (error) {
      throw error;
    }
  }

  @RequirePermission('agents.create')
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    const agentId = Number(id);
    
    if (isNaN(agentId)) {
      throw new Error('Invalid agent ID');
    }
    
    try {
      const result = await this.service.delete(agentId, user, req.ip || 'unknown');
      return result;
    } catch (error) {
      throw error;
    }
  }

  @RequirePermission('agents.view')
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    const agentId = Number(id);
    
    if (isNaN(agentId)) {
      throw new Error('Invalid agent ID');
    }
    
    try {
      const result = await this.service.findById(agentId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('verify-subdomain')
  async verifySubdomain(
    @Query('companyCode') companyCode: string,
    @Query('subdomain') subdomain: string
  ) {
    if (!companyCode || !subdomain) {
      throw new BadRequestException('Missing companyCode or subdomain');
    }

    try {
      const agent = await this.service.findBySubdomain(companyCode, subdomain);
      if (!agent) {
        throw new NotFoundException('Agent subdomain not found');
      }

      return {
        id: agent.id,
        agent_name: agent.agent_name,
        agent_level: agent.agent_level,
        status: agent.status,
        frontend_url: agent.frontend_url,
        company_id: agent.company_id
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error verifying subdomain');
    }
  }

  @Post('upload/bankcard')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads/agents',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `bankcard-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        cb(new BadRequestException('Only image files are allowed!'), false);
        return;
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    }
  }))
  uploadBankCardImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    const url = `/uploads/agents/${file.filename}`;
    return {
      url,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    };
  }
}