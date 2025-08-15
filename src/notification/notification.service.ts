import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityVerification } from '../identity-verification/identity-verification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(IdentityVerification)
    private identityRepo: Repository<IdentityVerification>,
  ) {}

  async sendVerificationNotification(verification: any) {
    // 暫時只記錄日誌，等 WebSocket 套件安裝後再啟用
    console.log(`新驗證申請通知: ${verification.type} - 用戶 ${verification.user?.username}`);
  }

  async getUnreadVerifications(userId: number, userRole: string, companyId?: number) {
    const qb = this.identityRepo
      .createQueryBuilder('verification')
      .leftJoinAndSelect('verification.user', 'user')
      .where('verification.status = :status', { status: 'PENDING' });

    // 根據角色權限過濾
    const isGlobalAdmin = ['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(userRole);
    if (!isGlobalAdmin && companyId) {
      qb.andWhere('user.company_id = :companyId', { companyId });
    }

    qb.orderBy('verification.createdAt', 'DESC');
    qb.take(10); // 最多返回10個未讀通知

    const verifications = await qb.getMany();

    return {
      count: verifications.length,
      notifications: verifications.map(v => ({
        id: v.id,
        type: 'NEW_VERIFICATION',
        verificationId: v.id,
        verificationType: v.type,
        username: v.user?.username,
        companyId: v.user?.company_id,
        message: `新的${v.type === 'ID_CARD' ? '身分證' : '銀行卡'}驗證申請`,
        timestamp: v.createdAt.toISOString(),
      }))
    };
  }
}