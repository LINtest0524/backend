import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../company/company.entity';
import { User } from '../user/user.entity';
import { DictionaryController } from './dictionary.controller';
import { DictionaryService } from './dictionary.service';
import { GameProviderModule } from '../game-provider/game-provider.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User]),
    GameProviderModule,
  ],
  controllers: [DictionaryController],
  providers: [DictionaryService],
  exports: [DictionaryService],
})
export class DictionaryModule {}