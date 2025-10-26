import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Banner } from '../banner/banner.entity';

@Entity('company')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string; // 公司代碼（唯一）

  @Column({ nullable: true })
  description: string; // 公司描述

  @Column({ default: 'active' })
  status: string; // 狀態：active, inactive

  @Column({ nullable: true })
  domain: string; // 專屬網域（可選）

  @Column('simple-array', { default: 'OLD_PASSWORD' })
  passwordModes: string[];

  @Column('simple-array', { default: 'USERNAME_PASSWORD,FACEBOOK' })
  loginMethods: string[]; // Login方式：USERNAME_PASSWORD, FACEBOOK, GOOGLE 等

  @Column({ type: 'json', nullable: true })
  shipping_rules: Array<{
    id: string;
    name: string;
    fee: number;
    freeThreshold: number;
    description?: string;
    enabled: boolean;
  }>; // 運送規則設定

  @Column({ type: 'json', nullable: true })
  settings: {
    theme?: string;
    features?: string[];
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      logo?: string;
    };
    [key: string]: any;
  }; // 公司特定設定

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Banner, banner => banner.company)
  banners: Banner[];
}
