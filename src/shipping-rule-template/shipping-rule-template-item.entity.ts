import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShippingRuleTemplate } from './shipping-rule-template.entity';

@Entity('shipping_rule_template_items')
export class ShippingRuleTemplateItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  template_id: number;

  @Column({ type: 'varchar', length: 255 })
  method: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  free_shipping_threshold: number;

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @ManyToOne(() => ShippingRuleTemplate, template => template.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ShippingRuleTemplate;

  @CreateDateColumn()
  created_at: Date;
}