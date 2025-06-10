import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { Module } from '../module/module.entity';
import { UserModule } from '../user-module/user-module.entity';
import { CreateUserDto } from './create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './update-user.dto';


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
    const users: User[] = await this.userRepository.find();
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

    // 放在最後面
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



}
