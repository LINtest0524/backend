import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockGamesController } from './mock-games.controller';
import { MockGamesService } from './mock-games.service';
import { MockGamesRepository } from './mock-games.repository';
import { BetTxnEntity } from './entities/bet-txn.entity';
import { RoundResultEntity } from './entities/round-result.entity';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BetTxnEntity, RoundResultEntity]),
    forwardRef(() => UserModule),
  ],
  controllers: [MockGamesController],
  providers: [MockGamesService, MockGamesRepository],
  exports: [MockGamesService, MockGamesRepository],
})
export class MockGamesModule {}