import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Company } from '../company/company.entity'

@Entity('marquee_tag')
export class MarqueeTag {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  backgroundColor: string

  @Column({ default: '#FFFFFF' })
  textColor: string

  @Column({ default: 'oval' })
  shape: string

  @Column({ default: true })
  isActive: boolean

  @ManyToOne(() => Company, (company) => company.id, { nullable: false })
  company: Company

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}