
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column("simple-array", { default: 'OLD_PASSWORD' }) // 可為 OLD_PASSWORD,EMAIL,SMS
  passwordModes: string[];
}
