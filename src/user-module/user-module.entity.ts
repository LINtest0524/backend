import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Module } from '../module/module.entity';

@Entity()
export class UserModule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Module, { eager: true, onDelete: 'CASCADE' })
  module: Module;
}
