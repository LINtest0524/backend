import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationService } from './notification.service';
import { Request } from 'express';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('unread-verifications')
  async getUnreadVerifications(@Req() req: Request) {
    const user = req.user as any;
    return this.notificationService.getUnreadVerifications(user.id, user.role, user.company_id);
  }
}