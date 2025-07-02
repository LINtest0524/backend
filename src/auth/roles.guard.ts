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
      throw new ForbiddenException('權限不足或未驗證');
    }

    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.SUPER_ADMIN]: 5,
      [UserRole.GLOBAL_ADMIN]: 4,
      [UserRole.AGENT_OWNER]: 3,
      [UserRole.AGENT_SUPPORT]: 2,
      [UserRole.USER]: 1,
    };

    const userLevel = roleHierarchy[user.role];

    // 通過檢查：只要 user 的層級 >= 任一 requiredRole 的層級
    const hasAccess = requiredRoles.some((role) => {
      const requiredLevel = roleHierarchy[role];
      return userLevel >= requiredLevel;
    });

    if (!hasAccess) {
      throw new ForbiddenException('權限不足');
    }

    return true;
  }
}
