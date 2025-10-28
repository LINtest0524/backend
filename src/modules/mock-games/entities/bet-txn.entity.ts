import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../../company/company.entity';

@Entity('mock_games_bet_txn')
@Index('idx_bet_txn_player_created', ['playerId', 'createdAt'])
@Index('idx_bet_txn_round', ['roundId'])
@Index('idx_bet_txn_client_txn', ['clientTxnId'])
@Index('idx_bet_txn_company_player', ['company_id', 'playerId'])
export class BetTxnEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ length: 255 })
  playerId: string;

  @Column({ nullable: true })
  company_id: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 255 })
  roundId: string;

  @Column({ length: 50 })
  gameId: string; // HI_LO | DICE

  @Column('decimal', { precision: 18, scale: 2 })
  betAmount: number;

  @Column('jsonb')
  betPayload: any;

  @Column({ length: 255, nullable: true })
  clientTxnId: string;

  @Column({ length: 500 })
  sessionToken: string;

  @Column({ length: 50, default: 'ACCEPTED' })
  status: string;

  @Column({ length: 100, nullable: true })
  txnId: string; // 系統產生的交易ID

  @Column({ type: 'bigint', nullable: true })
  processingTimeMs: number; // 處理時間（毫秒）
}