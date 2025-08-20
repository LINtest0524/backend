import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Order } from './order.entity'
import { ProductVariant } from '../product/product-variant.entity'

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  order_id: number

  @Column()
  product_id: number

  @Column()
  product_name: string

  @Column()
  product_sku: string

  @Column()
  quantity: number

  @Column('decimal', { precision: 10, scale: 2 })
  price: number

  @Column('text', { nullable: true })
  product_thumbnail: string

  @Column({ nullable: true })
  product_variant_id: number

  @Column({ nullable: true })
  variant_name: string

  @Column('json', { nullable: true })
  variant_options: Record<string, string> | null

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'product_variant_id' })
  variant: ProductVariant
}