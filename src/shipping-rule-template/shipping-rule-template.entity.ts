import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ShippingRuleTemplateItem } from './shipping-rule-template-item.entity';

@Entity('shipping_rule_templates')
export class ShippingRuleTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'integer', nullable: true })
  company_id: number;

  @OneToMany(() => ShippingRuleTemplateItem, item => item.template, { cascade: true, eager: true })
  items: ShippingRuleTemplateItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}