import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, PERMISSIONS_KEY, IS_PUBLIC_KEY } from './permission.decorator';
import { PermissionConfigService } from './permission-config.service';
import { UserRole } from '../user/user.entity';

/**
 * 權限守衛
 * 基於 PermissionConfigService 進行權限檢查
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionConfig: PermissionConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 檢查是否為公開端點
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 檢查單一權限
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    
    // 檢查多重權限
    const permissionsConfig = this.reflector.get<{type: 'any' | 'all', permissions: string[]}>(
      PERMISSIONS_KEY, 
      context.getHandler()
    );

    // 如果沒有設定權限要求，預設允許通過
    if (!requiredPermission && !permissionsConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 檢查用戶是否已登入
    if (!user?.role) {
      throw new ForbiddenException('未登入或權限不足');
    }

    const userRole = user.role as UserRole;

    try {
      // 處理單一權限
      if (requiredPermission) {
        const hasPermission = this.permissionConfig.hasPermission(userRole, requiredPermission);
        
        if (!hasPermission) {
          throw new ForbiddenException(
            `權限不足：需要 "${requiredPermission}" 權限，目前角色：${userRole}`
          );
        }
        return true;
      }

      // 處理多重權限
      if (permissionsConfig) {
        const { type, permissions } = permissionsConfig;
        let hasAccess = false;

        if (type === 'any') {
          // 滿足任一權限即可
          hasAccess = this.permissionConfig.hasAnyPermission(userRole, permissions);
        } else if (type === 'all') {
          // 必須滿足所有權限
          hasAccess = this.permissionConfig.hasAllPermissions(userRole, permissions);
        }

        if (!hasAccess) {
          throw new ForbiddenException(
            `權限不足：需要 "${permissions.join(', ')}" 權限 (${type === 'any' ? '任一' : '全部'})，目前角色：${userRole}`
          );
        }
        return true;
      }

      return false;
    } catch (error) {
      throw error;
    }
  }
}