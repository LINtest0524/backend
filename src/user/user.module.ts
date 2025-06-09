import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { Module as ModuleEntity } from '../module/module.entity';
import { UserModule as UserModuleEntity } from '../user-module/user-module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ModuleEntity, UserModuleEntity])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
