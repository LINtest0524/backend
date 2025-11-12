import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameProvider } from './game-provider.entity';
import { GameProviderService } from './game-provider.service';
import { GameProviderController } from './game-provider.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameProvider])],
  controllers: [GameProviderController],
  providers: [GameProviderService],
  exports: [GameProviderService],
})
export class GameProviderModule {}