import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Banner } from '../banner/banner.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('simple-array', { default: 'OLD_PASSWORD' }) // 可為 OLD_PASSWORD,EMAIL,SMS
  passwordModes: string[];

  @OneToMany(() => Banner, banner => banner.company)
  banners: Banner[];
}
