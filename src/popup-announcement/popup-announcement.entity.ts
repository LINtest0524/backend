import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('popup_announcements')
export class PopupAnnouncement {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 255 })
  title: string

  @Column({ length: 500, nullable: true })
  desktop_image_url: string

  @Column({ length: 500, nullable: true })
  mobile_image_url: string

  @Column({ length: 100, nullable: true })
  button_text: string

  @Column({ length: 500, nullable: true })
  button_url: string

  @Column({ default: 0 })
  sort_order: number

  @Column({ 
    type: 'varchar', 
    length: 20,
    default: 'active' 
  })
  status: string

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date

  @Column({ length: 10 })
  company_code: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}