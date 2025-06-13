import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
    @InjectRepository(UserModule)
    private readonly userModuleRepository: Repository<UserModule>,
  ) {}

  async create(createUserDto: CreateUserDto, creator: User): Promise<User> {

    const { username, password, email, modules, role, companyId } = createUserDto;
    console.log('creator.company.id =', creator.company?.id, 'target companyId =', companyId);

    // ========== 安全限制：AGENT_SUPPORT 禁止新增 ==========
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

      const user = this.userRepository.create({
        username,
        password: hashedPassword,
        email: email ?? null,
        role: role as any,
        company: { id: companyId } as any,
      });

      const savedUser: User = await this.userRepository.save(user);

      if (modules && modules.length > 0) {
        const moduleEntities = await this.moduleRepository.find({
          where: { code: In(modules) },
        });

        if (moduleEntities.length !== modules.length) {
          throw new NotFoundException('Some modules not found');
        }

        const userModules = moduleEntities.map((module) => {
          return this.userModuleRepository.create({
            user: savedUser,
            module,
          });
        });

        await this.userModuleRepository.save(userModules);
      }

      return savedUser;

  }

  async findAll(currentUser: User): Promise<any[]> {
    const isAdmin = currentUser.role === 'SUPER_ADMIN';

    const where: any = {
      deleted_at: IsNull(),
    };

    if (!isAdmin) {
      if (!currentUser.company?.id) {
        throw new UnauthorizedException('找不到使用者的公司資訊');
      }
      where.company = { id: currentUser.company.id };
    }

    const users: User[] = await this.userRepository.find({
      where,
      relations: ['company'],
      order: { id: 'ASC' },
    });

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
        created_at: user.created_at,
        updated_at: user.updated_at,
        modules,
        company: user.company
          ? {
              id: user.company.id,
              name: user.company.name,
            }
          : null,
      });
    }

    return results;
  }

  async update(id: number, updateUserDto: UpdateUserDto, currentUser: User): Promise<User> {
    if (currentUser.role === 'AGENT_SUPPORT') {
      throw new UnauthorizedException('AGENT_SUPPORT 不可修改使用者');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { email, status, modules, is_blacklisted } = updateUserDto;

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

      const userModules = moduleEntities.map((module) => {
        return this.userModuleRepository.create({
          user: { id: user.id },
          module,
        });
      });

      await this.userModuleRepository.save(userModules);
    }

    return user;
  }

  async findOneByUsername(username: string, relations: string[] = []): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'role', 'is_blacklisted'],
      relations,
    });
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

  async findById(id: number): Promise<any> {
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

  async softDelete(id: number, currentUser: User): Promise<{ message: string }> {
    if (currentUser.role === 'AGENT_SUPPORT') {
      throw new UnauthorizedException('AGENT_SUPPORT 不可刪除帳號');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    user.deleted_at = new Date();
    await this.userRepository.save(user);

    return { message: '使用者已刪除' };
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
    )
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
      .getMany()
  }

  // ✅ 專給 SUPER_ADMIN 使用的完整欄位查詢
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
        'company.id',
        'company.name',
      ])
      .orderBy('user.last_login_at', 'DESC')
      .addOrderBy('user.created_at', 'DESC')
      .getMany();
  }



}
