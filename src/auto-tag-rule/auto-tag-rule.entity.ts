import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { MarqueeTag } from '../marquee-tag/marquee-tag.entity';
import { Company } from '../company/company.entity';

export enum ConditionType {
  EQUALS = 'EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  NOT_NULL = 'NOT_NULL',
  IS_NULL = 'IS_NULL'
}

@Entity('auto_tag_rules')
export class AutoTagRule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MarqueeTag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: MarqueeTag;

  @Column()
  tag_id: number;

  @Column({ length: 50 })
  trigger_field: string; // 觸發欄位 (如: id_verified, bank_verified)

  @Column({ length: 50 })
  trigger_value: string; // 觸發值 (如: true, false, 1)

  @Column({ 
    type: 'enum', 
    enum: ConditionType, 
    default: ConditionType.EQUALS 
  })
  condition_type: ConditionType;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ nullable: true })
  company_id: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}