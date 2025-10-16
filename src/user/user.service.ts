import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { User } from './user.entity';
import { UserTag } from './user-tag.entity';
import { MarqueeTag } from '../marquee-tag/marquee-tag.entity';
import { AutoTagRuleService } from '../auto-tag-rule/auto-tag-rule.service';
import { Module } from '../module/module.entity';
import { UserModule } from '../user-module/user-module.entity';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from './user.entity';
import { Company } from '../company/company.entity';
import { JwtUserPayload, JwtUser } from '../types/jwt-payload';
import { AuditLogService } from '../audit-log/audit-log.service';
import { WalletTransactionService } from '../wallet-transaction/wallet-transaction.service';
import { WalletTransaction } from '../wallet-transaction/wallet-transaction.entity';

import { ExportUserDto } from './dto/export-user.dto';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTag)
    private readonly userTagRepository: Repository<UserTag>,
    @InjectRepository(MarqueeTag)
    private readonly marqueeTagRepository: Repository<MarqueeTag>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(UserModule)
    private readonly userModuleRepository: Repository<UserModule>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly auditLogService: AuditLogService,
    private readonly autoTagRuleService: AutoTagRuleService,
    private readonly walletTransactionService: WalletTransactionService,
  ) {}

  // 統一 IP 格式的輔助函數（與 auth.controller.ts 一致）
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























  async create(createUserDto: CreateUserDto, creator: User, ip?: string, platform?: string): Promise<User> {
    const { username, password, email, modules, role, companyId, department_type } = createUserDto;

    if (creator.role === 'AGENT_SUPPORT') {
      throw new UnauthorizedException('AGENT_SUPPORT 不可新增帳號');
    }

    if (creator.role === 'AGENT_OWNER') {
      if (role !== 'AGENT_SUPPORT') {
        throw new BadRequestException('AGENT_OWNER 僅可建立 AGENT_SUPPORT 帳號');
      }
      if (!creator.company || Number(companyId) !== Number(creator.company.id)) {
        throw new BadRequestException('只能建立自己公司底下的員工帳號');
      }
    }

    const existingUser = await this.userRepository.findOne({ where: { username } });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new BadRequestException('指定的公司不存在');
    }

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      email: email ?? null,
      role: role as any,
      company,
      created_by: creator,
      department_type: department_type ?? null,
    });

    const savedUser: User = await this.userRepository.save(user);

    if (modules && modules.length > 0) {
      const moduleEntities = await this.moduleRepository.find({
        where: { code: In(modules) },
      });

      if (moduleEntities.length !== modules.length) {
        throw new NotFoundException('Some modules not found');
      }

      const userModules = moduleEntities.map((module) =>
        this.userModuleRepository.create({ user: savedUser, module })
      );

      await this.userModuleRepository.save(userModules);
    }

    if (this.auditLogService && ip && platform) {
      await this.auditLogService.record({
        user: { id: creator.id },
        action: `新增後台使用者 - ${savedUser.username}（角色：${savedUser.role}${department_type ? `，部門：${department_type}` : ''}）`,
        ip,
        platform,
        target: `admin-user:${savedUser.id}`,
        after: {
          username: savedUser.username,
          role: savedUser.role,
          email: savedUser.email,
          department_type: savedUser.department_type,
          modules: modules ?? [],
        },
      });
    }

    return savedUser;
  }














async update(
  id: number,
  updateUserDto: UpdateUserDto,
  currentUser: JwtUser,
  ip?: string,
  platform?: string,
): Promise<User> {
  const user = await this.userRepository.findOne({
    where: {
      id,
      company: { id: currentUser.company_id },
    },
    relations: ['company'],
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
    throw new BadRequestException('更新資料不可為空');
  }

  const { email, status, modules, is_blacklisted, ip_whitelist, department_type } = updateUserDto;
  const before = { ...user };

  if (email !== undefined) user.email = email;
  if (status !== undefined) user.status = status;
  if (is_blacklisted !== undefined) user.is_blacklisted = is_blacklisted;
  if (ip_whitelist !== undefined) user.ip_whitelist = ip_whitelist;
  if (department_type !== undefined) user.department_type = department_type;

  await this.userRepository.save(user);

  if (modules) {
    const moduleEntities = await this.moduleRepository.find({
      where: { code: In(modules) },
    });

    if (moduleEntities.length !== modules.length) {
      throw new NotFoundException('Some modules not found');
    }

    await this.userModuleRepository.delete({ user: { id: user.id } });

    const userModules = moduleEntities.map((module) =>
      this.userModuleRepository.create({ user: { id: user.id }, module })
    );

    await this.userModuleRepository.save(userModules);
  }

  //   log1：紀錄黑名單變更（區分會員和管理員）
if (
  this.auditLogService &&
  is_blacklisted !== undefined &&
  is_blacklisted !== before.is_blacklisted &&
  ip &&
  platform
) {
  const blacklistAction = is_blacklisted ? '加入黑名單' : '移除黑名單';
  const blacklistStatus = is_blacklisted ? '是' : '否';
  
  // 判斷是會員還是管理員
  const isUser = user.role === 'USER';
  const actionPrefix = isUser ? '🚫 會員' : '🚫 管理員';
  const targetPrefix = isUser ? 'blacklist' : 'admin-user';
  
  await this.auditLogService.record({
    user: { id: currentUser.id },
    action: `${actionPrefix}${blacklistAction} - ${user.username}（黑名單：${blacklistStatus}）`,
    ip,
    platform,
    target: `${targetPrefix}:${user.id}`,
    before: { is_blacklisted: before.is_blacklisted },
    after: { is_blacklisted: user.is_blacklisted },
  });
}

  //   log2：紀錄status變更（區分會員和管理員）
  if (
    this.auditLogService &&
    ip &&
    platform &&
    status !== undefined &&
    status !== before.status
  ) {
    const statusMap = {
      'ACTIVE': 'active',
      'INACTIVE': 'inactive',
      'BANNED': '封鎖'
    };
    
    const beforeStatusText = statusMap[before.status] || before.status;
    const afterStatusText = statusMap[status] || status;
    
    // 判斷是會員還是管理員
    const isUser = user.role === 'USER';
    const actionPrefix = isUser ? '⚡ 變更會員status' : '👤 變更管理員status';
    const targetPrefix = isUser ? 'status' : 'admin-user';
    
    await this.auditLogService.record({
      user: { id: currentUser.id },
      action: `${actionPrefix} - ${user.username}（${beforeStatusText} → ${afterStatusText}）`,
      ip,
      platform,
      target: `${targetPrefix}:${user.id}`,
      before: { status: before.status },
      after: { status: user.status },
    });
  }

  //   log3：紀錄其他變更（Email等）
  if (
    this.auditLogService &&
    ip &&
    platform &&
    email !== undefined &&
    email !== before.email
  ) {
    await this.auditLogService.record({
      user: { id: currentUser.id },
      action: `修改會員資料 - ${user.username}（Email：${before.email ?? '-'} → ${email ?? '-'}）`,
      ip,
      platform,
      target: `admin-user:${user.id}`,
      before: { email: before.email },
      after: { email: user.email },
    });
  }

  //   log4：紀錄IP白名單變更
  if (
    this.auditLogService &&
    ip &&
    platform &&
    ip_whitelist !== undefined &&
    ip_whitelist !== before.ip_whitelist
  ) {
    await this.auditLogService.record({
      user: { id: currentUser.id },
      action: `🔒 IP白名單變更 - ${user.username}（${before.ip_whitelist ?? '無限制'} → ${ip_whitelist ?? '無限制'}）`,
      ip,
      platform,
      target: `admin-user:${user.id}`,
      before: { ip_whitelist: before.ip_whitelist },
      after: { ip_whitelist: user.ip_whitelist },
    });
  }

  //   log5：紀錄部門類型變更
  if (
    this.auditLogService &&
    ip &&
    platform &&
    department_type !== undefined &&
    department_type !== before.department_type
  ) {
    await this.auditLogService.record({
      user: { id: currentUser.id },
      action: `🏢 部門類型變更 - ${user.username}（${before.department_type ?? '未設定'} → ${department_type ?? '未設定'}）`,
      ip,
      platform,
      target: `admin-user:${user.id}`,
      before: { department_type: before.department_type },
      after: { department_type: user.department_type },
    });
  }

  return user;
}






























  async softDelete(id: number, currentUser: JwtUser, ip?: string, platform?: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: {
        id,
        company: { id: currentUser.company_id },
      },
    });

    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    user.deleted_at = new Date();
    await this.userRepository.save(user);

    if (this.auditLogService && ip && platform) {
      await this.auditLogService.record({
        user: { id: currentUser.id },
        action: `刪除後台使用者 - ${user.username}`,
        ip,
        platform,
        target: `admin-user:${user.id}`,
        before: {
          username: user.username,
          email: user.email,
          role: user.role,
          is_blacklisted: user.is_blacklisted,
        },
      });
    }

    return { message: '使用者deleted' };
  }




















//   查詢帳號 (給後台、portal 登入用)
async findOneByUsername(username: string, relations: string[] = []): Promise<User | null> {
  return await this.userRepository.findOne({
    where: { username },
    select: [
      'id',
      'username',
      'password',
      'role',
      'status',
      'is_blacklisted',
      'ip_whitelist', // 添加IP白名單欄位
    ],
    relations,
  });
}



//   查詢全部使用者（會員 / 管理員）
async findAll(
  currentUser: JwtUser,
  query: any,
  options?: { excludeUserRole?: boolean }
): Promise<{ data: any[]; totalPages: number; totalCount: number }> {
  const {
    username,
    status,
    blacklist,
    createdFrom,
    createdTo,
    loginFrom,
    loginTo,
    limit = 20,
    page = 1,
  } = query;

  const qb = this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.company', 'company')
    .leftJoinAndSelect('user.created_by', 'created_by')
    .where('user.deleted_at IS NULL');

  if (options?.excludeUserRole === true) {
    qb.andWhere('user.role != :userRole', { userRole: 'USER' });
  } else if (options?.excludeUserRole === false) {
    qb.andWhere('user.role = :userRole', { userRole: 'USER' });
  }

  const isGlobal = ['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(currentUser.role);
  if (!isGlobal) {
    // 從完整User Entity中取得公司 ID
    const companyId = currentUser.company?.id || currentUser.company_id;
    console.log('UserService.findAll 公司檢查:', { 
      userId: currentUser.id, 
      role: currentUser.role, 
      company: currentUser.company, 
      companyId 
    });
    
    if (!companyId) {
      throw new UnauthorizedException('not found使用者的公司資訊');
    }
    qb.andWhere('user.company_id = :companyId', { companyId });
  }

  if (username) {
    qb.andWhere('user.username ILIKE :username', { username: `%${username}%` });
  }

  if (status) {
    qb.andWhere('user.status = :status', { status });
  }

  if (blacklist === 'true') {
    qb.andWhere('user.is_blacklisted = true');
  } else if (blacklist === 'false') {
    qb.andWhere('user.is_blacklisted = false');
  }

  if (createdFrom) {
    qb.andWhere('user.created_at >= :createdFrom', { createdFrom });
  }

  if (createdTo) {
    qb.andWhere('user.created_at <= :createdTo', { createdTo });
  }

  if (loginFrom) {
    qb.andWhere('user.last_login_at >= :loginFrom', { loginFrom });
  }

  if (loginTo) {
    qb.andWhere('user.last_login_at <= :loginTo', { loginTo });
  }

  qb.orderBy('user.id', 'ASC');
  qb.take(Number(limit));
  qb.skip((Number(page) - 1) * Number(limit));

  const [users, total] = await qb.getManyAndCount();
  const results: any[] = [];

  for (const user of users) {
    const userModules = await this.userModuleRepository.find({
      where: { user: { id: user.id } },
      relations: ['module'],
    });

    const modules = userModules.map((um) => um.module.code);

    // 查詢使用者標籤
    const userTags = await this.userTagRepository.find({
      where: { user: { id: user.id } },
      relations: ['tag'],
    });

    const tags = userTags.map(userTag => ({
      id: userTag.tag.id,
      name: userTag.tag.name,
      backgroundColor: userTag.tag.backgroundColor,
      textColor: userTag.tag.textColor,
      shape: userTag.tag.shape,
    }));

    results.push({
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      role: user.role,
      department_type: user.department_type,
      last_login_at: user.last_login_at,
      last_login_ip: user.last_login_ip,
      last_login_platform: user.last_login_platform,
      created_by: user.created_by ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at,
      is_blacklisted: user.is_blacklisted,
      // 添加驗證相關欄位
      id_verified: user.id_verified,
      id_verified_at: user.id_verified_at,
      bank_verified: user.bank_verified,
      bank_verified_at: user.bank_verified_at,
      vip_level: user.vip_level,
      balance: user.balance || 0,
      modules,
      tags,
      company: user.company
        ? { id: user.company.id, name: user.company.name }
        : null,
    });
  }

  return {
    data: results,
    totalPages: Math.ceil(total / Number(limit)),
    totalCount: total,
  };
}


















async exportUsers(currentUser: JwtUser, query: ExportUserDto, res: Response): Promise<void> {
  const {
    username,
    status,
    blacklist,
    createdFrom,
    createdTo,
    loginFrom,
    loginTo,
    excludeUserRole,
    format = 'csv',
  } = query;


  const qb = this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.company', 'company')
    .where('user.deleted_at IS NULL');

  const isGlobal = ['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(currentUser.role);
  if (!isGlobal) {
    const companyId = currentUser.company?.id || currentUser.company_id;
    if (!companyId) throw new UnauthorizedException('not found公司');
    qb.andWhere('user.company_id = :companyId', { companyId });
  }

  if (excludeUserRole === 'true') {
    qb.andWhere('user.role != :userRole', { userRole: 'USER' });
  } else if (excludeUserRole === 'false') {
    qb.andWhere('user.role = :userRole', { userRole: 'USER' });
  }

  if (username) qb.andWhere('user.username ILIKE :username', { username: `%${username}%` });
  if (status) qb.andWhere('user.status = :status', { status });
  if (blacklist === 'true') qb.andWhere('user.is_blacklisted = true');
  if (blacklist === 'false') qb.andWhere('user.is_blacklisted = false');
  if (createdFrom) qb.andWhere('user.created_at >= :createdFrom', { createdFrom });
  if (createdTo) qb.andWhere('user.created_at <= :createdTo', { createdTo });
  if (loginFrom) qb.andWhere('user.last_login_at >= :loginFrom', { loginFrom });
  if (loginTo) qb.andWhere('user.last_login_at <= :loginTo', { loginTo });

  qb.orderBy('user.id', 'ASC');

  const users = await qb.getMany();

  const formatTime = (date?: Date | string | null): string => {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return ' ' + `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};


  const rows = users.map((u) => ({
    ID: u.id,
    帳號: u.username,
    Email: u.email ?? '',
    status: u.status,
    黑名單: u.is_blacklisted ? '是' : '否',
    company_name: u.company?.name ?? '',
    註冊時間: formatTime(u.created_at),        //   沒有加 `="..."`！
    最後登入時間: formatTime(u.last_login_at),
    最後登入IP: u.last_login_ip ?? '',
    登入平台: u.last_login_platform ?? '',
  }));

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];



if (format === 'xlsx') {
  if (rows.length === 0) {
    throw new BadRequestException("查無可export資料");
  }

  const firstRow = rows[0]; // 🚨 不再過濾，只要有一筆就拿它當欄位來源

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');

  sheet.columns = Object.keys(firstRow).map((key) => ({
    header: key,
    key,
    width: 20,
  }));

  // 確保資料一致：即便其他筆缺少欄位也補空字串
  const normalizedRows = rows.map((row) => {
    const filled: Record<string, string> = {};
    for (const key of Object.keys(firstRow)) {
      filled[key] = row[key] ?? '';
    }
    return filled;
  });

  if (normalizedRows.length === 1) {
    sheet.addRow(normalizedRows[0]);
  } else {
    sheet.addRows(normalizedRows);
  }


  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=users_${dateStr}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();



} else {
    if (rows.length === 0) {
      throw new BadRequestException("查無可export資料");
    }
    const csvHeader = Object.keys(rows[0]).join(',') + '\n';
    const csvBody = rows.map((row) =>
      Object.entries(row)
      .map(([key, val]) => {
        const str = String(val ?? '');
        const isSensitiveNumeric = /^[0-9]{8,}$/.test(str); // 8 碼以上純數字
        if (isSensitiveNumeric) return `="` + str + `"`;
        return `"${str.replace(/"/g, '""')}"`; // 正常處理其他欄位
      })

        .join(',')
    ).join('\n');

    const csv = '\uFEFF' + csvHeader + csvBody;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=users_${dateStr}.csv`);
    res.send(csv);
  }
}

























































  async findOneWithModules(id: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const userModules = await this.userModuleRepository.find({
      where: { user: { id: user.id } },
      relations: ['module'],
    });

    const modules = userModules.map((um) => um.module.code);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
      modules,
    };
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user) throw new NotFoundException('使用者不存在');

    const companyModes = user.company?.passwordModes ?? ['OLD_PASSWORD'];

    if (companyModes.includes('OLD_PASSWORD')) {
      if (!dto.oldPassword) throw new BadRequestException('請輸入舊密碼');
      if (!user.password) throw new BadRequestException('使用者密碼未設定');
      const match = await bcrypt.compare(dto.oldPassword, user.password);
      if (!match) throw new UnauthorizedException('舊密碼錯誤');
    }

    if (companyModes.includes('EMAIL')) {
      if (!dto.emailCode || dto.emailCode !== '123456') {
        throw new UnauthorizedException('Email 驗證碼錯誤');
      }
    }

    if (companyModes.includes('SMS')) {
      if (!dto.smsCode || dto.smsCode !== '666666') {
        throw new UnauthorizedException('簡訊驗證碼錯誤');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: '密碼變更成功' };
  }

  async findByCompany(companyId: number) {
    return this.userRepository.find({
      where: { company: { id: companyId } },
      relations: ['company'],
    });
  }

  async updateLoginInfo(userId: number, ip: string, platform: string) {
    await this.userRepository.update(
      { id: userId },
      {
        last_login_ip: ip,
        last_login_at: new Date(),
        last_login_platform: platform,
      },
    );
  }

  async findAllWithCompany(): Promise<User[]> {
    

    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.created_at',
        'user.status',
        'user.last_login_ip',
        'user.last_login_at',
        'user.last_login_platform',
        'company.id',
        'company.name',
      ])
      .orderBy('user.created_at', 'DESC')
      .getMany();
  }

  async findAllWithLoginInfo(): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.created_at',
        'user.status',
        'user.last_login_ip',
        'user.last_login_at',
        'user.last_login_platform',
        'user.is_blacklisted',
        'company.id',
        'company.name',
      ])
      .orderBy('user.last_login_at', 'DESC')
      .addOrderBy('user.created_at', 'DESC')
      .getMany();
  }

  async validatePortalUser(username: string, password: string): Promise<User | null> {
    
  const user = await this.userRepository.findOne({
    where: { username },
    relations: ['company'],
  });

  if (!user) return null;

  if (!user.password) {
    throw new UnauthorizedException('使用者密碼未設定');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new UnauthorizedException('密碼錯誤');

  if (user.is_blacklisted) {
    throw new UnauthorizedException('此帳號已被封鎖，請聯絡客服');
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedException('帳號已inactive');
  }


  return user;
}


  async createFromPortal(dto: {
    username: string;
    password: string;
    email?: string;
    companyCode: string;
  }): Promise<User> {
    const { username, password, email, companyCode } = dto;

    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('帳號already exists');
    }

    const company = await this.companyRepository.findOne({ where: { code: companyCode } });
    if (!company) {
      throw new NotFoundException('公司代碼無效');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      email: email ?? null,
      role: UserRole.USER,
      status: 'ACTIVE',
      is_blacklisted: false,
      company,
    });

    const savedUser = await this.userRepository.save(user);
    return this.findById(savedUser.id);
  }


async findOneSecured(id: number, currentUser: JwtUser): Promise<User> {
    // 全域管理員可以查詢所有用戶，其他角色只能查詢同公司用戶
    const isGlobalAdmin = ['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(currentUser.role);
    
    const whereClause: any = { id, deleted_at: IsNull() };
    if (!isGlobalAdmin) {
      whereClause.company = { id: currentUser.company_id };
    }
    
    const user = await this.userRepository.findOne({
      where: whereClause,
      relations: ['company'],
    });
    
    if (!user) {
      const errorMsg = isGlobalAdmin 
        ? 'not found該使用者' 
        : 'not found該使用者或不屬於你的公司';
      throw new NotFoundException(errorMsg);
    }
    
    return user;
  }

  async updateSecured(
    id: number,
    dto: UpdateUserDto,
    currentUser: JwtUser,
    ip?: string,
    platform?: string,
  ): Promise<User> {
    const user = await this.findOneSecured(id, currentUser);
    return this.update(user.id, dto, currentUser, ip, platform);
  }


  async resetPasswordSecured(
    id: number, 
    newPassword: string, 
    currentUser: JwtUser,
    ip?: string,
    platform?: string
  ): Promise<{ message: string }> {
    if (!newPassword) {
      throw new BadRequestException('新密碼不得為空');
    }

    const user = await this.findOneSecured(id, currentUser);
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await this.userRepository.save(user);

    // 記錄密碼重設操作到 audit log
    if (this.auditLogService && ip && platform) {
      // 判斷是會員還是管理員
      const isUser = user.role === 'USER';
      const userType = isUser ? '會員' : '管理員';
      
      await this.auditLogService.record({
        user: { id: currentUser.id },
        action: `🔑 重設${userType}密碼 - ${user.username}`,
        ip,
        platform,
        target: `admin-user:${user.id}`, // Password重設都記錄到管理員操作紀錄
        before: { action: '密碼重設前' },
        after: { action: '密碼已重設' },
      });
    }

    return { message: '密碼已重設' };
  }


  async softDeleteSecured(
    id: number,
    currentUser: JwtUser,
    ip?: string,
    platform?: string
  ): Promise<{ message: string }> {
    const user = await this.findOneSecured(id, currentUser);
    user.deleted_at = new Date();
    await this.userRepository.save(user);

    if (this.auditLogService && ip && platform) {
      await this.auditLogService.record({
        user: { id: currentUser.id },
        action: `刪除後台使用者 - ${user.username}`,
        ip,
        platform,
        target: `admin-user:${user.id}`,
        before: {
          username: user.username,
          email: user.email,
          role: user.role,
          is_blacklisted: user.is_blacklisted,
        },
      });
    }

    return { message: '使用者deleted' };
  }

  // 標籤管理方法
  async getUserTags(userId: number, currentUser: JwtUser) {
    // 檢查目標使用者是否存在
    const targetUser = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['company']
    });
    if (!targetUser) {
      throw new NotFoundException('使用者不存在');
    }

    // 檢查權限
    const hasPermission = 
      currentUser.role === 'SUPER_ADMIN' || 
      currentUser.id === userId ||
      (currentUser.role === 'AGENT_OWNER' && currentUser.company_id === targetUser.company?.id) ||
      (currentUser.role === 'AGENT_SUPPORT' && currentUser.company_id === targetUser.company?.id);

    if (!hasPermission) {
      throw new ForbiddenException('無權限查看此使用者的標籤');
    }

    const userTags = await this.userTagRepository.find({
      where: { user: { id: userId } },
      relations: ['tag'],
    });

    return userTags.map(userTag => ({
      id: userTag.id,
      tagId: userTag.tag.id,
      name: userTag.tag.name,
      backgroundColor: userTag.tag.backgroundColor,
      textColor: userTag.tag.textColor,
      shape: userTag.tag.shape,
      createdAt: userTag.createdAt,
    }));
  }

  async addUserTag(userId: number, tagId: number, currentUser: JwtUser) {
    // 檢查使用者是否存在
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['company']
    });
    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    // 檢查權限
    const hasPermission = 
      currentUser.role === 'SUPER_ADMIN' || 
      currentUser.id === userId ||
      (currentUser.role === 'AGENT_OWNER' && currentUser.company_id === user.company?.id) ||
      (currentUser.role === 'AGENT_SUPPORT' && currentUser.company_id === user.company?.id);

    if (!hasPermission) {
      throw new ForbiddenException('無權限為此使用者添加標籤');
    }

    // 檢查標籤是否存在
    const tag = await this.marqueeTagRepository.findOne({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException('標籤不存在');
    }

    // 檢查是否已經存在此標籤關聯
    const existingUserTag = await this.userTagRepository.findOne({
      where: { user: { id: userId }, tag: { id: tagId } },
    });

    if (existingUserTag) {
      throw new ConflictException('使用者已經擁有此標籤');
    }

    // 創建新的使用者標籤關聯
    const userTag = this.userTagRepository.create({
      user: user,
      tag: tag,
    });

    const savedUserTag = await this.userTagRepository.save(userTag);

    // 記錄審計日誌
    await this.auditLogService.record({
      user: currentUser,
      action: 'USER_TAG_ADD',
      ip: '127.0.0.1',
      platform: 'Backend',
      target: `使用者 ${user.email} 添加標籤 ${tag.name}`,
    });

    return {
      id: savedUserTag.id,
      tagId: tag.id,
      tagName: tag.name,
      createdAt: savedUserTag.createdAt,
    };
  }

  async removeUserTag(userId: number, tagId: number, currentUser: JwtUser) {
    // 查找使用者標籤關聯
    const userTag = await this.userTagRepository.findOne({
      where: { user: { id: userId }, tag: { id: tagId } },
      relations: ['user', 'tag', 'user.company'],
    });

    if (!userTag) {
      throw new NotFoundException('使用者標籤關聯不存在');
    }

    // 檢查權限
    const hasPermission = 
      currentUser.role === 'SUPER_ADMIN' || 
      currentUser.id === userId ||
      (currentUser.role === 'AGENT_OWNER' && currentUser.company_id === userTag.user.company?.id) ||
      (currentUser.role === 'AGENT_SUPPORT' && currentUser.company_id === userTag.user.company?.id);

    if (!hasPermission) {
      throw new ForbiddenException('無權限移除此使用者的標籤');
    }

    // 刪除使用者標籤關聯
    await this.userTagRepository.remove(userTag);

    // 記錄審計日誌
    await this.auditLogService.record({
      user: currentUser,
      action: 'USER_TAG_REMOVE',
      ip: '127.0.0.1',
      platform: 'Backend',
      target: `使用者 ${userTag.user.email} 移除標籤 ${userTag.tag.name}`,
    });

    return { message: '標籤已移除' };
  }

  // 身分證驗證更新
  async updateIdVerification(userId: number, verified: boolean, currentUser: JwtUser): Promise<{ message: string }> {
    const user = await this.findOneSecured(userId, currentUser);
    
    const before = { id_verified: user.id_verified };
    user.id_verified = verified;
    user.id_verified_at = verified ? new Date() : null;
    
    await this.userRepository.save(user);

    // 觸發自動化標籤檢查
    await this.autoTagRuleService.applyAutoTags(user, ['id_verified']);

    // 記錄審計日誌
    await this.auditLogService.record({
      user: currentUser,
      action: `身分證驗證${verified ? '通過' : '取消'}`,
      ip: '127.0.0.1',
      platform: 'Backend',
      target: `使用者 ${user.username} 身分證驗證狀態變更`,
      before,
      after: { id_verified: user.id_verified }
    });

    return { message: `身分證驗證狀態已${verified ? '通過' : '取消'}` };
  }

  // 銀行驗證更新
  async updateBankVerification(userId: number, verified: boolean, currentUser: JwtUser): Promise<{ message: string }> {
    const user = await this.findOneSecured(userId, currentUser);
    
    const before = { bank_verified: user.bank_verified };
    user.bank_verified = verified;
    user.bank_verified_at = verified ? new Date() : null;
    
    await this.userRepository.save(user);

    // 觸發自動化標籤檢查
    await this.autoTagRuleService.applyAutoTags(user, ['bank_verified']);

    // 記錄審計日誌
    await this.auditLogService.record({
      user: currentUser,
      action: `銀行驗證${verified ? '通過' : '取消'}`,
      ip: '127.0.0.1',
      platform: 'Backend',
      target: `使用者 ${user.username} 銀行驗證狀態變更`,
      before,
      after: { bank_verified: user.bank_verified }
    });

    return { message: `銀行驗證狀態已${verified ? '通過' : '取消'}` };
  }

  // VIP等級更新
  async updateVipLevel(userId: number, level: number, currentUser: JwtUser): Promise<{ message: string }> {
    const user = await this.findOneSecured(userId, currentUser);
    
    const before = { vip_level: user.vip_level };
    user.vip_level = level;
    
    await this.userRepository.save(user);

    // 觸發自動化標籤檢查
    await this.autoTagRuleService.applyAutoTags(user, ['vip_level']);

    // 記錄審計日誌
    await this.auditLogService.record({
      user: currentUser,
      action: `VIP等級變更`,
      ip: '127.0.0.1',
      platform: 'Backend',
      target: `使用者 ${user.username} VIP等級: ${before.vip_level} → ${level}`,
      before,
      after: { vip_level: user.vip_level }
    });

    return { message: `VIP等級已更新為 ${level}` };
  }

  // 批量應用自動化標籤 (用於初始化或規則變更後)
  async applyAutoTagsToAllUsers(companyId?: number): Promise<{ message: string; processedCount: number }> {
    const whereClause = companyId ? { company_id: companyId } : {};
    const users = await this.userRepository.find({ 
      where: whereClause,
      relations: ['company'] 
    });

    let processedCount = 0;
    for (const user of users) {
      await this.autoTagRuleService.applyAutoTags(user);
      processedCount++;
    }

    return { 
      message: `已為 ${processedCount} 位使用者應用自動化標籤規則`,
      processedCount 
    };
  }

  // 為特定使用者應用自動化標籤
  async applyAutoTagsToUser(userId: number, currentUser: JwtUser): Promise<{ message: string; appliedTags: any[] }> {
    const user = await this.findOneSecured(userId, currentUser);
    
    // 獲取應用前的標籤
    const beforeTags = await this.userTagRepository.find({
      where: { user: { id: userId } },
      relations: ['tag'],
    });

    // 應用自動化標籤
    await this.autoTagRuleService.applyAutoTags(user);

    // 獲取應用後的標籤
    const afterTags = await this.userTagRepository.find({
      where: { user: { id: userId } },
      relations: ['tag'],
    });

    const appliedTags = afterTags.filter(afterTag => 
      !beforeTags.some(beforeTag => beforeTag.tag.id === afterTag.tag.id)
    ).map(tag => ({
      id: tag.tag.id,
      name: tag.tag.name,
      backgroundColor: tag.tag.backgroundColor,
      textColor: tag.tag.textColor,
      shape: tag.tag.shape,
    }));

    return {
      message: `已為使用者 ${user.username} 應用自動化標籤，新增 ${appliedTags.length} 個標籤`,
      appliedTags
    };
  }

  // 更新使用者餘額 - 加強安全性
  async updateBalance(
    userId: number, 
    amount: number, 
    remark: string,
    currentUser: JwtUser,
    ip?: string,
    platform?: string
  ): Promise<{ message: string; newBalance: number; oldBalance: number }> {
    // 🔒 嚴格權限檢查
    const allowedRoles = ['SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException('無權限執行此操作');
    }

    // 🔒 嚴格輸入驗證
    if (!amount || amount === 0 || !Number.isInteger(amount)) {
      throw new BadRequestException('金額必須為非零整數');
    }

    if (Math.abs(amount) > 1000000) {
      throw new BadRequestException('單次操作金額不能超過 1,000,000');
    }

    // 🔒 防止 SQL 注入和 XSS
    if (remark && (remark.includes('<') || remark.includes('>') || remark.includes('script'))) {
      throw new BadRequestException('備註內容包含非法字符');
    }

    const user = await this.findOneSecured(userId, currentUser);
    
    // 🔒 使用 transaction 確保資料一致性
    return await this.userRepository.manager.transaction(async manager => {
      // 重新查詢最新資料，避免併發問題
      const latestUser = await manager.findOne(User, { 
        where: { id: userId },
        relations: ['company']
      });
      if (!latestUser) {
        throw new BadRequestException('用戶不存在');
      }
      
      // 確保有 username，如果沒有則使用 ID 作為備用
      const displayUsername = latestUser.username || `用戶${latestUser.id}`;

      const oldBalance = latestUser.balance || 0;
      const newBalance = oldBalance + amount;

      // 🔒 嚴格檢查餘額範圍
      if (newBalance < 0) {
        throw new BadRequestException(`餘額不足，目前餘額：${oldBalance}，扣款金額：${Math.abs(amount)}`);
      }

      if (newBalance > 10000000) {
        throw new BadRequestException('餘額不能超過 10,000,000');
      }

      latestUser.balance = newBalance;
      await manager.save(latestUser);

      // 📝 記錄錢包交易 - 直接創建記錄，不重新計算餘額
      if (this.walletTransactionService) {
        const operationType = amount > 0 ? 'admin_deposit' : 'admin_deduction';
        const operationTypeText = amount > 0 ? '管理員存款' : '管理員扣款';
        const description = `${operationTypeText}${remark ? `: ${remark}` : ''}（操作員：${currentUser.username}）`;

        // 直接創建交易記錄，使用已計算好的餘額
        const transaction = manager.create(WalletTransaction, {
          userId: latestUser.id,
          companyId: latestUser.company_id,
          transactionType: operationType,
          amount: amount,
          balanceBefore: oldBalance,
          balanceAfter: newBalance,
          description: description,
          referenceId: undefined,
          referenceType: 'admin_operation',
          ipAddress: ip,
          createdBy: currentUser.id,
        });

        await manager.save(WalletTransaction, transaction);
      }

      // 🔒 強制記錄所有金額操作到審計日誌
      if (this.auditLogService && ip && platform) {
        const operationType = amount > 0 ? '存款' : '扣款';
        const operationAmount = Math.abs(amount);
        
        await this.auditLogService.record({
          user: { id: currentUser.id },
          action: `💰 ${operationType}操作 - ${displayUsername}（金額：${operationAmount}，餘額：${oldBalance} → ${newBalance}）`,
          ip: this.normalizeIP(ip || '127.0.0.1'),
          platform,
          target: `balance:${latestUser.id}`,
          before: { 
            balance: oldBalance,
            username: displayUsername,
            userId: latestUser.id,
            remark: remark || '無備註',
            operator: currentUser.username
          },
          after: { 
            balance: newBalance,
            username: displayUsername,
            userId: latestUser.id,
            remark: remark || '無備註',
            operator: currentUser.username
          },
        });
      }

      return {
        message: `${amount > 0 ? '存款' : '扣款'}成功`,
        newBalance,
        oldBalance
      };
    });
  }

  // 檢查自動標籤狀態
  async checkAutoTagStatus(userId: number, currentUser: JwtUser): Promise<any> {
    const user = await this.findOneSecured(userId, currentUser);
    
    // 獲取該公司的自動化規則
    const rules = await this.autoTagRuleService.findAll(user.company_id);
    
    // 獲取使用者目前的標籤
    const userTags = await this.userTagRepository.find({
      where: { user: { id: userId } },
      relations: ['tag'],
    });

    const userTagIds = userTags.map(ut => ut.tag.id);

    // 檢查每個規則的狀態
    const ruleStatuses = rules.map(rule => {
      const fieldValue = user[rule.trigger_field];
      const shouldHaveTag = this.evaluateAutoTagCondition(fieldValue, rule.trigger_value, rule.condition_type);
      const hasTag = userTagIds.includes(rule.tag_id);

      return {
        ruleId: rule.id,
        tagId: rule.tag_id,
        tagName: rule.tag?.name || '未知標籤',
        triggerField: rule.trigger_field,
        triggerValue: rule.trigger_value,
        conditionType: rule.condition_type,
        currentFieldValue: fieldValue,
        shouldHaveTag,
        hasTag,
        isCorrect: shouldHaveTag === hasTag,
        description: rule.description
      };
    });

    return {
      userId: user.id,
      username: user.username,
      userVerificationStatus: {
        id_verified: user.id_verified,
        bank_verified: user.bank_verified,
        vip_level: user.vip_level
      },
      currentTags: userTags.map(ut => ({
        id: ut.tag.id,
        name: ut.tag.name,
        backgroundColor: ut.tag.backgroundColor,
        textColor: ut.tag.textColor,
        shape: ut.tag.shape,
      })),
      ruleStatuses,
      summary: {
        totalRules: ruleStatuses.length,
        correctRules: ruleStatuses.filter(r => r.isCorrect).length,
        incorrectRules: ruleStatuses.filter(r => !r.isCorrect).length
      }
    };
  }

  // 評估自動標籤條件的輔助方法
  private evaluateAutoTagCondition(fieldValue: any, triggerValue: string, conditionType: string): boolean {
    switch (conditionType) {
      case 'EQUALS':
        if (triggerValue === 'true') return fieldValue === true;
        if (triggerValue === 'false') return fieldValue === false;
        return String(fieldValue) === triggerValue;
      case 'GREATER_THAN':
        const numValue = Number(fieldValue);
        const numTrigger = Number(triggerValue);
        return !isNaN(numValue) && !isNaN(numTrigger) && numValue > numTrigger;
      case 'LESS_THAN':
        const numValue2 = Number(fieldValue);
        const numTrigger2 = Number(triggerValue);
        return !isNaN(numValue2) && !isNaN(numTrigger2) && numValue2 < numTrigger2;
      case 'NOT_NULL':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'IS_NULL':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      default:
        return false;
    }
  }

  // 簽到系統專用的餘額更新方法 - 不需要權限檢查
  async updateBalanceForCheckin(
    userId: number, 
    amount: number, 
    description: string,
    systemUserInfo: any,
    ip?: string
  ): Promise<{ message: string; newBalance: number; oldBalance: number }> {

    // 基本輸入驗證
    if (!amount || amount === 0 || !Number.isInteger(amount)) {
      throw new BadRequestException('金額必須為非零整數');
    }

    if (amount < 0) {
      throw new BadRequestException('簽到獎勵金額不能為負數');
    }

    if (amount > 100000) {
      throw new BadRequestException('單次簽到獎勵不能超過 100,000');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company']
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }
    
    // 使用 transaction 確保資料一致性
    return await this.userRepository.manager.transaction(async manager => {
      // 重新查詢最新資料，避免併發問題
      const latestUser = await manager.findOne(User, { 
        where: { id: userId },
        relations: ['company']
      });
      if (!latestUser) {
        throw new BadRequestException('用戶不存在');
      }
      
      const displayUsername = latestUser.username || `用戶${latestUser.id}`;
      const oldBalance = latestUser.balance || 0;
      const newBalance = oldBalance + amount;

      // 檢查餘額範圍
      if (newBalance > 10000000) {
        throw new BadRequestException('餘額不能超過 10,000,000');
      }

      latestUser.balance = newBalance;
      await manager.save(latestUser);

      // 記錄錢包交易
      if (this.walletTransactionService) {
        const transaction = manager.create(WalletTransaction, {
          userId: latestUser.id,
          companyId: latestUser.company_id,
          transactionType: 'checkin_reward',
          amount: amount,
          balanceBefore: oldBalance,
          balanceAfter: newBalance,
          description: description,
          referenceId: undefined,
          referenceType: 'checkin_system',
          ipAddress: ip,
          createdBy: systemUserInfo?.id || 1,
        });

        await manager.save(WalletTransaction, transaction);
      }

      // 記錄審計日誌
      if (this.auditLogService && ip) {
        await this.auditLogService.record({
          user: { id: systemUserInfo?.id || 1 },
          action: `🎁 簽到獎勵 - ${displayUsername}（金額：${amount}，餘額：${oldBalance} → ${newBalance}）`,
          ip: this.normalizeIP(ip || '127.0.0.1'),
          platform: 'Checkin System',
          target: `checkin-reward:${latestUser.id}`,
          before: { 
            balance: oldBalance,
            username: displayUsername,
            userId: latestUser.id,
            description: description
          },
          after: { 
            balance: newBalance,
            username: displayUsername,
            userId: latestUser.id,
            description: description
          },
        });
      }


      return {
        message: '簽到獎勵發放成功',
        newBalance,
        oldBalance
      };
    });
  }


}
