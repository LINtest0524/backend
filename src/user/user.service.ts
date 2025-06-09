import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './create-user.dto';
import * as bcrypt from 'bcrypt';
import { Module } from '../module/module.entity';
import { UserModule } from '../user-module/user-module.entity';

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

    const existingUser = await this.userRepository.findOne({ where: { username: username } });
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
        const userModule = this.userModuleRepository.create({
          user: savedUser,
          module: module,
        });
        return userModule;
      });

      await this.userModuleRepository.save(userModules);
    }

    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username: username } });
  }

  async findOneById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id: id } });
  }
}
