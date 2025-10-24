import { Injectable, UnauthorizedException } from '@nestjs/common';


import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { User, UserRole } from '../user/user.entity';
import { CompanyModule } from '../company-module/company-module.entity';
import { Company } from '../company/company.entity';
import { Blacklist } from '../blacklist/blacklist.entity';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SessionService } from '../common/session.service';


@Injectable()
export class AuthService {
  
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Blacklist)
    private readonly blacklistRepository: Repository<Blacklist>,
    private readonly auditLogService: AuditLogService,
    private readonly sessionService: SessionService,
  ) {}

  // 統一 IP 格式的輔助函數
  private normalizeIP(ip: string): string {
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
      return '127.0.0.1'; // 統一顯示為 IPv4 localhost
    }
    // 處理其他 IPv6 mapped IPv4 地址
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7); // 移除 ::ffff: 前綴
    }
    return ip;
  }

  // IP封鎖檢查
  private async checkIPBlacklist(clientIp: string): Promise<void> {
    const blacklistRecords = await this.blacklistRepository.find({
      where: { ip: clientIp },
    });

    // 檢查完全匹配的IP
    for (const record of blacklistRecords) {
      if (record.ip === clientIp) {
        throw new UnauthorizedException(`IP地址已被封鎖${record.reason ? `：${record.reason}` : ''}`);
      }
    }

    // 檢查通配符匹配
    const allBlacklistRecords = await this.blacklistRepository.find();
    for (const record of allBlacklistRecords) {
      if (record.ip && this.isIPMatched(clientIp, record.ip)) {
        throw new UnauthorizedException(`IP地址已被封鎖${record.reason ? `：${record.reason}` : ''}`);
      }
    }
  }

  // IP匹配檢查（支持通配符）
  private isIPMatched(clientIp: string, blacklistIp: string): boolean {
    // 如果黑名單是 * 則匹配所有IP
    if (blacklistIp === '*') {
      return true;
    }

    // 如果黑名單包含 * 通配符
    if (blacklistIp.includes('*')) {
      // 將 * 替換為正則表達式的 .*
      const regex = new RegExp('^' + blacklistIp.replace(/\*/g, '.*') + '$');
      return regex.test(clientIp);
    }

    // 完全匹配
    return clientIp === blacklistIp;
  }

  async validateUser(
  username: string,
  pass: string,
  companyCode?: string,
  clientIp?: string,
): Promise<User | null> {
  
  // IP封鎖檢查
  if (clientIp) {
    const normalizedClientIp = this.normalizeIP(clientIp);
    await this.checkIPBlacklist(normalizedClientIp);
  }
  
  const user = await this.userService.findOneByUsername(username, ['company']);

  

  if (!user) {
    return null;
  }

  if (companyCode) {
    const decodedCode = decodeURIComponent(companyCode);
    if (user.company?.code !== decodedCode) {
      return null;
    }
  }

  if (!user.password) {
    return null;
  }
  
  const isMatch = await bcrypt.compare(pass, user.password);
  

  if (!isMatch) {
    return null;
  }

  if (user.is_blacklisted) {
    throw new UnauthorizedException('此帳號已被列入黑名單，無法登入');
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedException('帳號已inactive或封鎖，無法登入');
  }

  // IP白名單檢查
  if (user.ip_whitelist && clientIp) {
    // 標準化IP格式
    const normalizedClientIp = this.normalizeIP(clientIp);
    const normalizedWhitelistIp = this.normalizeIP(user.ip_whitelist);
    
    if (normalizedClientIp !== normalizedWhitelistIp) {
      throw new UnauthorizedException('此帳號僅限特定網路位置登入，請聯絡管理員');
    }
  }

  //   僅允許特定角色登入後台
  const allowedRoles = [
    'SUPER_ADMIN',
    'GLOBAL_ADMIN',
    'AGENT_OWNER',
    'AGENT_LEVEL_1',
    'AGENT_LEVEL_2',
    'AGENT_LEVEL_3',
    'AGENT_LEVEL_4',
    'AGENT_SUPPORT',
  ];
  if (!allowedRoles.includes(user.role)) {
    throw new UnauthorizedException(`角色 ${user.role} 無權限登入管理後台`);
  }

  return user;
}


  async login(
    username: string,
    password: string,
    clientIp: string,
    platform: string,
    companyCode?: string,
  ): Promise<{ user: any; token: string }> {

    const user = await this.validateUser(username, password, companyCode, clientIp);

    if (!user) {
      throw new UnauthorizedException('帳號、密碼或公司錯誤');
    }

    //   更新 user 資料
    await this.userService.updateLoginInfo(user.id, clientIp, platform);

    //   寫入操作紀錄（登入後台）
    await this.auditLogService.record({
      user,
      action: '登入後台',
      ip: clientIp,
      platform,
      target: 'login:admin', //   一定要補上這行，才能讓後端辨別是哪一類紀錄
    });



    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.company?.id ?? null,
    };

    const secret = this.configService.get('JWT_SECRET');
    const token = this.jwtService.sign(payload, { secret });

    // 創建會話記錄
    this.sessionService.createSession(
      user.id,
      user.username,
      user.company?.id ?? 0,
      token,
      `${platform} - ${clientIp}`
    );

    let enabledModules: CompanyModule[] = [];

    if (user.company?.id) {
      enabledModules = await this.moduleRepo.find({
        where: { company: { id: user.company.id }, enabled: true },
      });
    }

    return {
      token,
      user: {
        userId: user.id,
        username: user.username,
        role: user.role,
        companyId: user.company?.id ?? null,
        company: user.company ?? null,
        enabledModules: Object.fromEntries(
          enabledModules.map((m) => [m.module_key, true])
        ),
      },
    };
  }

  async validateFacebookUser(facebookUser: any, companyCode?: string): Promise<any> {
    
    const { facebookId, firstName, lastName, picture } = facebookUser;

    // 根據公司代碼找到對應的公司 ID
    let companyId = 1; // Default公司 A
    if (companyCode) {
      const companyRepo = this.userRepository.manager.getRepository(Company);
      const company = await companyRepo.findOne({ where: { code: companyCode } });
      if (company) {
        companyId = company.id;
      } else {
      }
    }

    // 先嘗試用 Facebook ID + 公司 ID 找用戶（允許同一個 FB 用戶在不同公司註冊）
    let user = await this.userRepository.findOne({
      where: { 
        facebook_id: facebookId,
        company: { id: companyId }
      },
      relations: ['company'],
    });


    // 如果還是沒找到，為該公司創建新用戶
    if (!user) {
      
      // 生成唯一的用戶名（包含公司代碼以避免衝突）
      const username = `fb_${facebookId}_${companyCode || 'default'}`;
      
      user = this.userRepository.create({
        username: username,
        password: null, // Facebook 用戶沒有密碼
        facebook_id: facebookId,
        first_name: firstName,
        last_name: lastName,
        profile_picture: picture,
        role: UserRole.USER, // Default角色
        company: { id: companyId },
        status: 'ACTIVE',
      });
      
      try {
        await this.userRepository.save(user);
        
        // 重新查詢以獲取完整的關聯資料
        user = await this.userRepository.findOne({
          where: { id: user.id },
          relations: ['company'],
        });
      } catch (error) {
        console.error('    創建用戶失敗:', error);
        throw error;
      }
    }

    return user;
  }

  async facebookLogin(user: any, clientIp: string, platform: string, companyCode?: string) {
    const validatedUser = await this.validateFacebookUser(user, companyCode);
    
    //   檢查用戶status和黑名單
    if (validatedUser.is_blacklisted) {
      throw new UnauthorizedException('此帳號已被列入黑名單，無法登入');
    }

    if (validatedUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('帳號已inactive或封鎖，無法登入');
    }
    
    //   更新用戶登入資訊（IP、時間、平台）
    await this.userService.updateLoginInfo(validatedUser.id, clientIp, platform);
    
    // 寫入操作紀錄（Facebook 登入）
    await this.auditLogService.record({
      user: validatedUser,
      action: `Facebook登入代理商${validatedUser.company?.code ?? ''}官網`,
      ip: clientIp,
      platform,
      target: `login-portal:${validatedUser.id}`,
    });

    const payload = {
      userId: validatedUser.id,
      username: validatedUser.username,
      role: validatedUser.role,
      companyId: validatedUser.company?.id ?? null,
    };

    const secret = this.configService.get('JWT_SECRET');
    const token = this.jwtService.sign(payload, { secret });

    // 創建會話記錄
    this.sessionService.createSession(
      validatedUser.id,
      validatedUser.username,
      validatedUser.company?.id ?? 0,
      token,
      `${platform} - ${clientIp}`
    );

    let enabledModules: CompanyModule[] = [];

    if (validatedUser.company?.id) {
      enabledModules = await this.moduleRepo.find({
        where: { company: { id: validatedUser.company.id }, enabled: true },
      });
    }

    return {
      token,
      user: {
        userId: validatedUser.id,
        username: validatedUser.username,
        email: validatedUser.email,
        role: validatedUser.role,
        companyId: validatedUser.company?.id ?? null,
        company: validatedUser.company ?? null,
        firstName: validatedUser.first_name,
        lastName: validatedUser.last_name,
        profilePicture: validatedUser.profile_picture,
        enabledModules: Object.fromEntries(
          enabledModules.map((m) => [m.module_key, true])
        ),
      },
    };
  }




}
