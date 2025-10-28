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
      [UserRole.SUPER_ADMIN]: 9,     // 超級管理員(系統開發者)
      [UserRole.GLOBAL_ADMIN]: 8,    // 全域管理者(大老闆)
      [UserRole.AGENT_LEVEL_1]: 7,   // 一級代理商
      [UserRole.AGENT_LEVEL_2]: 6,   // 二級代理商
      [UserRole.AGENT_LEVEL_3]: 5,   // 三級代理商
      [UserRole.AGENT_LEVEL_4]: 4,   // 四級代理商
      [UserRole.AGENT_SUPPORT]: 3,   // 客服人員
      [UserRole.USER]: 1,            // 一般會員
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
