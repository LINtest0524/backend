import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule as UserModuleEntity } from '../user-module/user-module.entity';
import { Module as ModuleEntity } from '../module/module.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserModuleEntity, ModuleEntity]),
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
