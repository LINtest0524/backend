import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentOptionsService } from './agent.options';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company])],
  controllers: [AgentController],
  providers: [AgentService, AgentOptionsService],
  exports: [TypeOrmModule, AgentService],
})
export class AgentModule {}