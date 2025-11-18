import { Controller, Get, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { Public } from './auth/permission.decorator';
import { AgentService } from './agent/agent.service';

@Controller('public/agents')
export class PublicAgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('test')
  @Public()
  async test() {
    console.log('[PublicAgent] Test endpoint called');
    return { message: 'PublicAgentController is working!', timestamp: new Date() };
  }

  @Get('verify-subdomain')
  @Public()
  async verifySubdomain(
    @Query('companyCode') companyCode: string,
    @Query('subdomain') subdomain: string
  ) {
    console.log(`[PublicAgent] Verifying subdomain: companyCode=${companyCode}, subdomain=${subdomain}`);
    
    if (!companyCode || !subdomain) {
      throw new BadRequestException('Missing companyCode or subdomain');
    }

    try {
      console.log(`[PublicAgent] Calling agentService.findBySubdomain...`);
      const agent = await this.agentService.findBySubdomain(companyCode, subdomain);
      console.log(`[PublicAgent] Agent query result:`, agent);
      
      if (!agent) {
        console.log(`[PublicAgent] No agent found for subdomain: ${subdomain}`);
        throw new NotFoundException('Agent subdomain not found');
      }

      return {
        id: agent.id,
        agent_name: agent.agent_name,
        agent_level: agent.agent_level,
        status: agent.status,
        frontend_url: agent.frontend_url,
        company_id: agent.company_id,
        login_account: agent.username // 推廣代碼實際上是登入帳號
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error verifying subdomain');
    }
  }
}