import { Injectable } from '@nestjs/common';
import { UserRole } from '../user/user.entity';

/**
 * 權限配置服務
 * 集中管理所有功能的權限要求，避免散佈在各個 Controller 中
 */
@Injectable()
export class PermissionConfigService {
  
  /**
   * 所有代理商角色的便捷陣列
   */
  private readonly ALL_AGENT_ROLES = [
    UserRole.AGENT_LEVEL_1,
    UserRole.AGENT_LEVEL_2,
    UserRole.AGENT_LEVEL_3,
    UserRole.AGENT_LEVEL_4,
    UserRole.AGENT_LEVEL_5,
    UserRole.AGENT_LEVEL_6,
    UserRole.AGENT_LEVEL_7,
    UserRole.AGENT_LEVEL_8,
    UserRole.AGENT_LEVEL_9,
    UserRole.AGENT_LEVEL_10,
    UserRole.AGENT_LEVEL_11,
    UserRole.AGENT_LEVEL_12
  ];

  /**
   * 管理員角色的便捷陣列
   */
  private readonly ADMIN_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN
  ];

  /**
   * 所有管理角色（管理員 + 代理商）的便捷陣列
   */
  private readonly ALL_MANAGEMENT_ROLES = [
    ...this.ADMIN_ROLES,
    ...this.ALL_AGENT_ROLES
  ];

  /**
   * 集中定義所有功能的權限要求
   * 格式：'模組.動作': [允許的角色列表]
   */
  private readonly PERMISSION_CONFIG: Record<string, UserRole[]> = {
    // 用戶管理
    'users.view': this.ALL_MANAGEMENT_ROLES,
    'users.create': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'users.edit': this.ALL_MANAGEMENT_ROLES,
    'users.delete': this.ADMIN_ROLES,
    
    // 代理商管理
    'agents.view': this.ALL_MANAGEMENT_ROLES,
    'agents.create': this.ALL_MANAGEMENT_ROLES,
    'agents.commission': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'agents.manage': this.ALL_MANAGEMENT_ROLES,
    
    // 訂單管理
    'orders.view': this.ALL_MANAGEMENT_ROLES,
    'orders.manage': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1,
      UserRole.AGENT_LEVEL_2
    ],
    'orders.create': this.ALL_MANAGEMENT_ROLES,
    
    // 財務管理
    'finance.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'finance.admin': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'finance.withdraw': this.ADMIN_ROLES,
    'finance.balance': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1,
      UserRole.AGENT_LEVEL_2
    ],
    
    // 產品管理
    'products.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'products.create': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'products.edit': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'products.delete': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    
    // 公司管理
    'companies.view': this.ADMIN_ROLES,
    'companies.manage': this.ADMIN_ROLES,
    
    // 系統設定
    'system.config': this.ADMIN_ROLES,
    'system.maintenance': [UserRole.SUPER_ADMIN],
    
    // 日誌審計
    'audit.view': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    
    // 新聞管理
    'news.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'news.create': this.ALL_MANAGEMENT_ROLES,
    'news.edit': this.ALL_MANAGEMENT_ROLES,
    'news.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 橫幅管理
    'banners.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'banners.create': this.ALL_MANAGEMENT_ROLES,
    'banners.edit': this.ALL_MANAGEMENT_ROLES,
    'banners.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 彈窗管理
    'popups.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'popups.create': this.ALL_MANAGEMENT_ROLES,
    'popups.edit': this.ALL_MANAGEMENT_ROLES,
    'popups.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 浮動廣告管理
    'floating-ads.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'floating-ads.create': this.ALL_MANAGEMENT_ROLES,
    'floating-ads.edit': this.ALL_MANAGEMENT_ROLES,
    'floating-ads.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 跑馬燈管理
    'marquee.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'marquee.create': this.ALL_MANAGEMENT_ROLES,
    'marquee.edit': this.ALL_MANAGEMENT_ROLES,
    'marquee.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 選單管理
    'menus.view': this.ALL_MANAGEMENT_ROLES,
    'menus.create': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1,
      UserRole.AGENT_LEVEL_2
    ],
    'menus.edit': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1,
      UserRole.AGENT_LEVEL_2
    ],
    'menus.delete': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1,
      UserRole.AGENT_LEVEL_2
    ],
    
    // 簽到活動管理
    'checkin.view': this.ALL_MANAGEMENT_ROLES,
    'checkin.create': this.ALL_MANAGEMENT_ROLES,
    'checkin.edit': this.ALL_MANAGEMENT_ROLES,
    'checkin.delete': this.ALL_MANAGEMENT_ROLES,
    'checkin.perform': this.ALL_MANAGEMENT_ROLES,
    
    // 抽獎活動管理
    'luckydraw.view': this.ALL_MANAGEMENT_ROLES,
    'luckydraw.create': this.ALL_MANAGEMENT_ROLES,
    'luckydraw.edit': this.ALL_MANAGEMENT_ROLES,
    'luckydraw.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 優惠券管理
    'coupons.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'coupons.create': this.ALL_MANAGEMENT_ROLES,
    'coupons.edit': this.ALL_MANAGEMENT_ROLES,
    'coupons.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 促銷活動管理
    'promotions.view': [
      ...this.ALL_MANAGEMENT_ROLES,
      UserRole.AGENT_SUPPORT
    ],
    'promotions.create': this.ALL_MANAGEMENT_ROLES,
    'promotions.edit': this.ALL_MANAGEMENT_ROLES,
    'promotions.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 黑名單管理
    'blacklists.view': this.ALL_MANAGEMENT_ROLES,
    'blacklists.create': this.ALL_MANAGEMENT_ROLES,
    'blacklists.edit': this.ALL_MANAGEMENT_ROLES,
    'blacklists.delete': this.ALL_MANAGEMENT_ROLES,
    
    // 維護管理
    'maintenance.view': this.ALL_MANAGEMENT_ROLES,
    'maintenance.create': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'maintenance.edit': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    
    // 遊戲供應商管理
    'game-providers.view': this.ALL_MANAGEMENT_ROLES,
    'game-providers.create': this.ADMIN_ROLES,
    'game-providers.edit': this.ADMIN_ROLES,
    'game-providers.delete': this.ADMIN_ROLES,
    
    // LOGO 管理
    'logos.view': this.ALL_MANAGEMENT_ROLES,
    'logos.create': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'logos.edit': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'logos.delete': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    
    // 聯絡資訊管理
    'contact-info.view': this.ALL_MANAGEMENT_ROLES,
    'contact-info.create': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'contact-info.edit': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
    'contact-info.delete': [
      ...this.ADMIN_ROLES,
      UserRole.AGENT_LEVEL_1
    ],
  };

  /**
   * 檢查用戶是否有指定權限
   */
  hasPermission(userRole: UserRole, permission: string): boolean {
    const allowedRoles = this.PERMISSION_CONFIG[permission];
    if (!allowedRoles) {
      console.warn(`⚠️ 權限配置中找不到權限: ${permission}`);
      return false;
    }
    return allowedRoles.includes(userRole);
  }

  /**
   * 檢查用戶是否有任意一個權限
   */
  hasAnyPermission(userRole: UserRole, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * 檢查用戶是否擁有所有指定權限
   */
  hasAllPermissions(userRole: UserRole, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * 獲取所有權限配置
   */
  getAllPermissions(): Record<string, UserRole[]> {
    return { ...this.PERMISSION_CONFIG };
  }

  /**
   * 獲取指定權限的允許角色列表
   */
  getPermissionRoles(permission: string): UserRole[] {
    return this.PERMISSION_CONFIG[permission] || [];
  }

  /**
   * 獲取用戶可用的權限列表
   */
  getUserPermissions(userRole: UserRole): string[] {
    const permissions: string[] = [];
    for (const [permission, allowedRoles] of Object.entries(this.PERMISSION_CONFIG)) {
      if (allowedRoles.includes(userRole)) {
        permissions.push(permission);
      }
    }
    return permissions;
  }
}