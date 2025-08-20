import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm'
import { OrderItem } from './order-item.entity'
import { User } from '../user/user.entity'

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  order_number: string

  @Column()
  customer_name: string

  @Column()
  customer_phone: string

  @Column()
  customer_email: string

  @Column('text')
  shipping_address: string

  @Column({ nullable: true })
  shipping_method_id: string

  @Column({ nullable: true })
  shipping_method_name: string

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  shipping_fee: number

  @Column()
  payment_method: string

  @Column('decimal', { precision: 10, scale: 2 })
  total_amount: number

  @Column({ default: 'pending' })
  status: string // pending, paid, processing, shipped, delivered, cancelled, refunded

  @Column({ nullable: true })
  payment_status: string // pending, paid, refunded, cancelled

  @Column({ nullable: true })
  shipping_status: string // pending, processing, shipped, delivered

  @Column('text', { nullable: true })
  notes: string

  @Column('text', { nullable: true })
  admin_notes: string

  @Column()
  company: string

  @Column({ nullable: true })
  user_id: number

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User

  // 綠界金流相關欄位
  @Column({ nullable: true })
  ecpay_merchant_trade_no: string // 綠界訂單編號

  @Column({ nullable: true })
  ecpay_trade_no: string // 綠界交易編號

  @Column({ nullable: true })
  ecpay_payment_type: string // 綠界付款方式

  @Column({ nullable: true })
  ecpay_payment_date: string // 綠界付款日期

  @Column('text', { nullable: true })
  ecpay_return_data: string // 綠界回傳資料 (JSON)

  @OneToMany(() => OrderItem, orderItem => orderItem.order, { cascade: true })
  items: OrderItem[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}