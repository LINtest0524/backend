import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './create-user.dto';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, phone } = createUserDto;

    const existingUser = await this.userRepository.findOneBy({ username });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      phone: phone ?? null,
      agent_name: '預設代理商',
      user_code: uuidv4(),
      status: 'ACTIVE',
    });

    return this.userRepository.save(user);
  }

  async login(username: string, password: string, clientIp?: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findOneBy({ username });

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    user.last_login_at = new Date();
    user.last_login_ip = clientIp ?? null;
    await this.userRepository.save(user);

    const token = this.authService.generateToken(user);
    return { user, token };
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }
}
