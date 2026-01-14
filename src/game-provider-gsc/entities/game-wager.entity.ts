import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
// import { Agent } from '../../agent/entities/agent.entity';
import { Company } from '../../company/company.entity';

/**
 * 遊戲注單記錄
 */
@Entity('game_wagers')
@Index(['userId', 'createdAt'])
@Index(['agentId', 'createdAt'])
@Index(['companyId', 'createdAt'])
@Index(['wagerStatus', 'createdAt'])
export class GameWager {
  @PrimaryGeneratedColumn()
  id: number;

  // 關聯資訊
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'agent_id', nullable: true })
  agentId: number;

  // 暫時註解掉 Agent 關聯，避免 TypeORM 載入順序問題
  // @ManyToOne(() => Agent, { nullable: true })
  // @JoinColumn({ name: 'agent_id' })
  // agent: Agent;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // 注單基本資訊
  @Column({ name: 'wager_code', unique: true, length: 100 })
  @Index()
  wagerCode: string; // 遊戲商注單號

  @Column({ name: 'round_id', nullable: true, length: 100 })
  roundId: string; // 遊戲局號

  @Column({ name: 'game_code', length: 100 })
  gameCode: string; // 遊戲代碼

  @Column({ name: 'product_code' })
  productCode: number; // 產品代碼 (1006, 1009, etc.)

  @Column({ name: 'game_type', length: 50 })
  gameType: string; // SLOT, LIVE_CASINO, etc.

  @Column({ length: 20 })
  currency: string; // CNY, TWD, etc.

  // 金額資訊 (以「分」為單位儲存)
  @Column({ name: 'bet_amount', type: 'bigint' })
  betAmount: number; // 下注金額

  @Column({ name: 'valid_bet_amount', type: 'bigint' })
  validBetAmount: number; // 有效投注

  @Column({ name: 'prize_amount', type: 'bigint', default: 0 })
  prizeAmount: number; // 中獎金額

  @Column({ name: 'tip_amount', type: 'bigint', default: 0 })
  tipAmount: number; // 小費金額

  // 狀態資訊
  @Column({ name: 'wager_status', length: 20 })
  wagerStatus: string; // BET, SETTLED, VOID, etc.

  @Column({ name: 'wager_type', length: 20 })
  wagerType: string; // NORMAL, FREEROUND

  @Column({ name: 'channel_code', nullable: true, length: 50 })
  channelCode: string; // gscp

  // 額外資訊
  @Column({ type: 'jsonb', nullable: true })
  payload: any; // 遊戲商原始資料

  // 時間資訊
  @Column({ name: 'settled_at', type: 'bigint', nullable: true })
  settledAt: number; // 結算時間戳 (毫秒)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
