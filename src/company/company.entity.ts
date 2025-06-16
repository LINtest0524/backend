import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Banner } from '../banner/banner.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  code: string; // ✅ 新增欄位：代碼

  @Column('simple-array', { default: 'OLD_PASSWORD' })
  passwordModes: string[];

  @OneToMany(() => Banner, banner => banner.company)
  banners: Banner[];
}
