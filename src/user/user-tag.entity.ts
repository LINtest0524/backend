import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, Column } from 'typeorm';
import { User } from './user.entity';
import { MarqueeTag } from '../marquee-tag/marquee-tag.entity';

@Entity('user_tag')
export class UserTag {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => MarqueeTag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: MarqueeTag;

  @Column({ name: 'tag_id' })
  tag_id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}