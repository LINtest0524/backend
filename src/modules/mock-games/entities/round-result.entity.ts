import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('mock_games_round_result')
@Index('idx_round_result_player_settled', ['playerId', 'settledAt'])
@Index('idx_round_result_round_unique', ['roundId'], { unique: true })
@Index('idx_round_result_game_settled', ['gameId', 'settledAt'])
export class RoundResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ length: 255 })
  playerId: string;

  @Column({ length: 255, unique: true })
  roundId: string;

  @Column({ length: 50 })
  gameId: string; // HI_LO | DICE

  @Column('jsonb')
  result: any; // 遊戲結果 {card: 6, outcome: 'LOW'} | {dice: [1,1,4], sum: 6}

  @Column('decimal', { precision: 18, scale: 2 })
  winAmount: number;

  @Column('decimal', { precision: 18, scale: 2 })
  balanceAfter: number;

  @Column({ default: true })
  finished: boolean;

  @CreateDateColumn()
  settledAt: Date;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  betAmount: number; // 關聯的下注金額，方便查詢

  @Column({ type: 'bigint', nullable: true })
  processingTimeMs: number; // 結算處理時間（毫秒）

  @Column({ length: 100, nullable: true })
  outcome: string; // 遊戲結果描述：WIN, LOSE, DRAW
}