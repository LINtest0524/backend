import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../user/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;


    if (!user || !user.role) {
      throw new ForbiddenException('insufficient permissions或未驗證');
    }

    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.SUPER_ADMIN]: 15,      // 超級管理員(系統開發者)
      [UserRole.GLOBAL_ADMIN]: 14,     // 全域管理者(大老闆)
      [UserRole.AGENT_LEVEL_1]: 13,    // 一級代理商
      [UserRole.AGENT_LEVEL_2]: 12,    // 二級代理商
      [UserRole.AGENT_LEVEL_3]: 11,    // 三級代理商
      [UserRole.AGENT_LEVEL_4]: 10,    // 四級代理商
      [UserRole.AGENT_LEVEL_5]: 9,     // 五級代理商
      [UserRole.AGENT_LEVEL_6]: 8,     // 六級代理商
      [UserRole.AGENT_LEVEL_7]: 7,     // 七級代理商
      [UserRole.AGENT_LEVEL_8]: 6,     // 八級代理商
      [UserRole.AGENT_LEVEL_9]: 5,     // 九級代理商
      [UserRole.AGENT_LEVEL_10]: 4,    // 十級代理商
      [UserRole.AGENT_LEVEL_11]: 3,    // 十一級代理商
      [UserRole.AGENT_LEVEL_12]: 2,    // 十二級代理商
      [UserRole.AGENT_SUPPORT]: 1,     // 客服人員
      [UserRole.USER]: 0,              // 一般會員
    };

    const userLevel = roleHierarchy[user.role];

    // 通過檢查：只要 user 的層級 >= 任一 requiredRole 的層級
    const hasAccess = requiredRoles.some((role) => {
      const requiredLevel = roleHierarchy[role];
      return userLevel >= requiredLevel;
    });

    if (!hasAccess) {
      throw new ForbiddenException('insufficient permissions');
    }

    return true;
  }
}
