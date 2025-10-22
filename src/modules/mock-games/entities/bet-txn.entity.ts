import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('mock_games_bet_txn')
@Index('idx_bet_txn_player_created', ['playerId', 'createdAt'])
@Index('idx_bet_txn_round', ['roundId'])
@Index('idx_bet_txn_client_txn', ['clientTxnId'])
export class BetTxnEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ length: 255 })
  playerId: string;

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