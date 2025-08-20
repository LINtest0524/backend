import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Banner } from '../banner/banner.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string; //   新增欄位：代碼

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

  @OneToMany(() => Banner, banner => banner.company)
  banners: Banner[];
}
