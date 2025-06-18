import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Company } from '../company/company.entity'

@Entity('marquee')
export class Marquee {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column({ nullable: true })
  content: string

  @Column({ nullable: true })
  link: string

  @Column({ default: true })
  isActive: boolean

  @ManyToOne(() => Company, (company) => company.id, { nullable: false })
  company: Company

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
