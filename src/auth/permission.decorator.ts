import { SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * 權限元數據的 Key
 */
export const PERMISSION_KEY = 'permission';
export const PERMISSIONS_KEY = 'permissions';

/**
 * 單一權限裝飾器
 * @param permission 權限名稱，格式：'模組.動作' (例如: 'users.create')
 */
export const RequirePermission = (permission: string) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSION_KEY, permission)(target, propertyName, descriptor);
    UseGuards(JwtAuthGuard, PermissionGuard)(target, propertyName, descriptor);
  };
};

/**
 * 多重權限裝飾器 (滿足其中任一權限即可)
 * @param permissions 權限名稱陣列
 */
export const RequireAnyPermission = (permissions: string[]) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, { type: 'any', permissions })(target, propertyName, descriptor);
    UseGuards(JwtAuthGuard, PermissionGuard)(target, propertyName, descriptor);
  };
};

/**
 * 多重權限裝飾器 (必須滿足所有權限)
 * @param permissions 權限名稱陣列
 */
export const RequireAllPermissions = (permissions: string[]) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, { type: 'all', permissions })(target, propertyName, descriptor);
    UseGuards(JwtAuthGuard, PermissionGuard)(target, propertyName, descriptor);
  };
};

/**
 * 公開端點裝飾器 (不需要身份驗證)
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);