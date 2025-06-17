import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { Company } from '../company/company.entity'

@Entity('company_modules')
export class CompanyModule {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Company, { eager: true })
  company: Company

  @Column()
  module_key: string

  @Column({ default: true })
  enabled: boolean

  @Column('simple-array', { nullable: true })
  pages: string[]

  @Column('simple-array', { nullable: true })
  exclude_pages: string[]
}
