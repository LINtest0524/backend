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
import { Module } from '../module/module.entity';
import { UserModule } from '../user-module/user-module.entity';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from './user.entity';
import { Company } from '../company/company.entity';
import { JwtUserPayload } from '../types/jwt-payload';
import { AuditLogService } from '../audit-log/audit-log.service';

import { ExportUserDto } from './dto/export-user.dto';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(UserModule)
    private readonly userModuleRepository: Repository<UserModule>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly auditLogService: AuditLogService,
  ) {}























  async create(createUserDto: CreateUserDto, creator: User, ip?: string, platform?: string): Promise<User> {
    const { username, password, email, modules, role, companyId } = createUserDto;

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
        action: `新增後台使用者 - ${savedUser.username}（角色：${savedUser.role}）`,
        ip,
        platform,
        target: `admin-user:${savedUser.id}`,
        after: {
          username: savedUser.username,
          role: savedUser.role,
          email: savedUser.email,
          modules: modules ?? [],
        },
      });
    }

    return savedUser;
  }














async update(
  id: number,
  updateUserDto: UpdateUserDto,
  currentUser: JwtUserPayload,
  ip?: string,
  platform?: string,
): Promise<User> {
  const user = await this.userRepository.findOne({
    where: {
      id,
      company: { id: currentUser.companyId },
    },
    relations: ['company'],
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!updateUserDto || Object.keys(updateUserDto).length === 0) {
    throw new BadRequestException('更新資料不可為空');
  }

  const { email, status, modules, is_blacklisted } = updateUserDto;
  const before = { ...user };

  if (email !== undefined) user.email = email;
  if (status !== undefined) user.status = status;
  if (is_blacklisted !== undefined) user.is_blacklisted = is_blacklisted;

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

  // ✅ log1：紀錄黑名單變更（獨立記錄）
if (
  this.auditLogService &&
  is_blacklisted !== undefined &&
  is_blacklisted !== before.is_blacklisted &&
  ip &&
  platform
) {
  await this.auditLogService.record({
    user: { id: currentUser.userId },
    action: `修改會員黑名單 - ${user.username}（${is_blacklisted ? '加入' : '移除'}）`,
    ip,
    platform,
    target: `blacklist:${user.id}`,  // ✅ 改成這樣
    before: { is_blacklisted: before.is_blacklisted },
    after: { is_blacklisted: user.is_blacklisted },
  });
}


  // ✅ log2：紀錄其他變更（不包含黑名單）
  if (
    this.auditLogService &&
    ip &&
    platform &&
    (
      email !== before.email ||
      status !== before.status
    )
  ) {
    const diffs: string[] = [];
    if (email !== before.email) diffs.push(`📧 Email：${before.email ?? '-'} → ${email ?? '-'}`);
    if (status !== before.status) diffs.push(`📌 狀態：${before.status} → ${status}`);

    await this.auditLogService.record({
      user: { id: currentUser.userId },
      action: `編輯後台使用者2 - ${user.username}（${diffs.join('、') || '未變更'}）`,
      ip,
      platform,
      target: `admin-user:${user.id}`,
      before: {
        email: before.email,
        status: before.status,
      },
      after: {
        email: user.email,
        status: user.status,
      },
    });
  }

  return user;
}






























  async softDelete(id: number, currentUser: JwtUserPayload, ip?: string, platform?: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: {
        id,
        company: { id: currentUser.companyId },
      },
    });

    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    user.deleted_at = new Date();
    await this.userRepository.save(user);

    if (this.auditLogService && ip && platform) {
      await this.auditLogService.record({
        user: { id: currentUser.userId },
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

    return { message: '使用者已刪除' };
  }




















// ✅ 查詢帳號 (給後台、portal 登入用)
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
    ],
    relations,
  });
}



// ✅ 查詢全部使用者（會員 / 管理員）
async findAll(
  currentUser: JwtUserPayload,
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
    if (!currentUser.companyId) {
      throw new UnauthorizedException('找不到使用者的公司資訊');
    }
    qb.andWhere('user.companyId = :companyId', { companyId: currentUser.companyId });
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

    results.push({
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      role: user.role,
      last_login_at: user.last_login_at,
      last_login_ip: user.last_login_ip,
      last_login_platform: user.last_login_platform,
      created_by: user.created_by ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at,
      is_blacklisted: user.is_blacklisted,
      modules,
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


















async exportUsers(currentUser: JwtUserPayload, query: ExportUserDto, res: Response): Promise<void> {
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
    if (!currentUser.companyId) throw new UnauthorizedException('找不到公司');
    qb.andWhere('user.companyId = :companyId', { companyId: currentUser.companyId });
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
    狀態: u.status,
    黑名單: u.is_blacklisted ? '是' : '否',
    公司名稱: u.company?.name ?? '',
    註冊時間: formatTime(u.created_at),        // ✅ 沒有加 `="..."`！
    最後登入時間: formatTime(u.last_login_at),
    最後登入IP: u.last_login_ip ?? '',
    登入平台: u.last_login_platform ?? '',
  }));

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');

    sheet.columns = Object.keys(rows[0]).map((key) => ({
      header: key,
      key,
      width: 20,
    }));

    sheet.addRows(rows);

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users_${dateStr}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } else {
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

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new UnauthorizedException('密碼錯誤');

  if (user.is_blacklisted) {
    throw new UnauthorizedException('此帳號已被封鎖，請聯絡客服');
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedException('帳號已停用');
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
      throw new ConflictException('帳號已存在');
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


async findOneSecured(id: number, currentUser: JwtUserPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, company: { id: currentUser.companyId }, deleted_at: IsNull() },
      relations: ['company'],
    });
    if (!user) {
      throw new NotFoundException('找不到該使用者或不屬於你的公司');
    }
    return user;
  }

  async updateSecured(
    id: number,
    dto: UpdateUserDto,
    currentUser: JwtUserPayload,
    ip?: string,
    platform?: string,
  ): Promise<User> {
    const user = await this.findOneSecured(id, currentUser);
    return this.update(user.id, dto, currentUser, ip, platform);
  }


  async resetPasswordSecured(id: number, newPassword: string, currentUser: JwtUserPayload): Promise<{ message: string }> {
    if (!newPassword) {
      throw new BadRequestException('新密碼不得為空');
    }

    const user = await this.findOneSecured(id, currentUser);
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await this.userRepository.save(user);
    return { message: '密碼已重設' };
  }


  async softDeleteSecured(
    id: number,
    currentUser: JwtUserPayload,
    ip?: string,
    platform?: string
  ): Promise<{ message: string }> {
    const user = await this.findOneSecured(id, currentUser);
    user.deleted_at = new Date();
    await this.userRepository.save(user);

    if (this.auditLogService && ip && platform) {
      await this.auditLogService.record({
        user: { id: currentUser.userId },
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

    return { message: '使用者已刪除' };
  }









}
