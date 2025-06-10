import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user-module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserModule])],
  exports: [TypeOrmModule],
})
export class UserModuleModule {}
