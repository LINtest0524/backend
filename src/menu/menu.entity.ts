import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';
import { User } from '../user/user.entity';

export enum MenuDeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  BOTH = 'both',
}

export enum MenuStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, { eager: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column()
  company_id: number;

  @ManyToOne(() => Menu, menu => menu.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Menu;

  @Column({ nullable: true })
  parent_id: number;

  @OneToMany(() => Menu, menu => menu.parent)
  children: Menu[];

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string;

  @Column({ type: 'boolean', default: false })
  target_blank: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string;

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @Column({
    type: 'enum',
    enum: MenuDeviceType,
    default: MenuDeviceType.BOTH,
  })
  device_type: MenuDeviceType;

  @Column({
    type: 'enum',
    enum: MenuStatus,
    default: MenuStatus.ACTIVE,
  })
  status: MenuStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;

  @Column({ nullable: true })
  created_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 計算選單層級
  get level(): number {
    if (!this.parent_id) return 1;
    // 這裡可以遞歸計算，但為了簡化，我們限制最多3級
    return this.parent?.parent_id ? 3 : 2;
  }
}