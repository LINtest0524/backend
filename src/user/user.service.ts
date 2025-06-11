import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { Module } from '../module/module.entity';
import { UserModule } from '../user-module/user-module.entity';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto'; // ✅ 請確認你已建立這個 DTO
import * as bcrypt from 'bcrypt';
import { IsNull } from 'typeorm';

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

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, email, modules } = createUserDto;

    const existingUser = await this.userRepository.findOne({ where: { username } });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      email: email ?? null,
    });
    const savedUser = await this.userRepository.save(user);

    if (modules && modules.length > 0) {
      const moduleEntities = await this.moduleRepository.find({
        where: { code: In(modules) }
      });

      if (moduleEntities.length !== modules.length) {
        throw new NotFoundException('Some modules not found');
      }

      const userModules = moduleEntities.map((module) => {
        return this.userModuleRepository.create({
          user: savedUser,
          module: module,
        });
      });

      await this.userModuleRepository.save(userModules);
    }

    return savedUser;
  }

  async findAll(): Promise<any[]> {
    const users: User[] = await this.userRepository.find({
    where: { deleted_at: IsNull() }, // ← 只撈沒被刪除的
  });
    const results: any[] = [];

    for (const user of users) {
      const userModules = await this.userModuleRepository.find({
        where: { user: { id: user.id } },
        relations: ['module'],
      });

      const modules = userModules.map(um => um.module.code);

      results.push({
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        modules: modules,
      });
    }

    return results;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { email, status, modules } = updateUserDto;

    if (email !== undefined) user.email = email;
    if (status !== undefined) user.status = status;

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

  async findOneByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async findOneWithModules(id: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const userModules = await this.userModuleRepository.find({
      where: { user: { id: user.id } },
      relations: ['module'],
    });

    const modules = userModules.map(um => um.module.code);

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

    // 1. 舊密碼驗證
    if (companyModes.includes('OLD_PASSWORD')) {
      if (!dto.oldPassword) throw new BadRequestException('請輸入舊密碼');
      const match = await bcrypt.compare(dto.oldPassword, user.password);
      if (!match) throw new UnauthorizedException('舊密碼錯誤');
    }

    // 2. Email 驗證
    if (companyModes.includes('EMAIL')) {
      if (!dto.emailCode || dto.emailCode !== '123456') {
        throw new UnauthorizedException('Email 驗證碼錯誤');
      }
    }

    // 3. SMS 驗證
    if (companyModes.includes('SMS')) {
      if (!dto.smsCode || dto.smsCode !== '666666') {
        throw new UnauthorizedException('簡訊驗證碼錯誤');
      }
    }

    // 修改密碼
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: '密碼變更成功' };
  }


  async softDelete(id: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('使用者不存在');
    }

    user.deleted_at = new Date();
    await this.userRepository.save(user);

    return { message: '使用者已刪除' };
  }


}
