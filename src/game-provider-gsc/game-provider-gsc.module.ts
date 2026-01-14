import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameWager } from './entities/game-wager.entity';
import { SeamlessWalletController } from './controllers/seamless-wallet.controller';
import { GameProviderGscService } from './services/game-provider-gsc.service';
import { SignatureService } from './services/signature.service';
import { UserModule } from '../user/user.module';
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameWager]),
    UserModule,
    WalletTransactionModule,
  ],
  controllers: [SeamlessWalletController],
  providers: [GameProviderGscService, SignatureService],
  exports: [GameProviderGscService, SignatureService],
})
export class GameProviderGscModule {}
