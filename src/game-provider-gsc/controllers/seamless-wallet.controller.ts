import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GameProviderGscService } from '../services/game-provider-gsc.service';
import { SignatureVerificationGuard } from '../guards/signature-verification.guard';
import {
  BalanceRequestDto,
  BalanceResponseDto,
  WithdrawRequestDto,
  WithdrawResponseDto,
  DepositRequestDto,
  DepositResponseDto,
  PushBetDataRequestDto,
  PushBetDataResponseDto,
} from '../dto';
import { SeamlessWalletCode } from '../constants/gsc.constants';

/**
 * Seamless Wallet Controller
 * 處理遊戲商呼叫我們的 API
 */
@Controller('v1/api/seamless')
export class SeamlessWalletController {
  constructor(
    private readonly gameProviderGscService: GameProviderGscService,
  ) {}

  /**
   * Balance API - 查詢玩家餘額
   * POST /v1/api/seamless/balance
   */
  @Post('balance')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignatureVerificationGuard)
  async balance(@Body() request: BalanceRequestDto): Promise<BalanceResponseDto> {
    console.log('='.repeat(80));
    console.log('[GSC+ Balance API] Request received');
    console.log('Request:', JSON.stringify(request, null, 2));

    try {
      const data = await this.gameProviderGscService.handleBalance(
        request.batch_requests,
      );

      console.log('[GSC+ Balance API] Response:', JSON.stringify(data, null, 2));
      console.log('='.repeat(80));

      return { data };
    } catch (error) {
      console.error('[GSC+ Balance API] Error:', error);
      console.log('='.repeat(80));
      throw error;
    }
  }

  /**
   * Withdraw API - 扣款 (下注)
   * POST /v1/api/seamless/withdraw
   */
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignatureVerificationGuard)
  async withdraw(@Body() request: WithdrawRequestDto): Promise<WithdrawResponseDto> {
    console.log('='.repeat(80));
    console.log('[GSC+ Withdraw API] Request received');
    console.log('Request:', JSON.stringify(request, null, 2));

    try {
      const data = await this.gameProviderGscService.handleWithdraw(
        request.batch_requests,
      );

      console.log('[GSC+ Withdraw API] Response:', JSON.stringify(data, null, 2));
      console.log('='.repeat(80));

      return { data };
    } catch (error) {
      console.error('[GSC+ Withdraw API] Error:', error);
      console.log('='.repeat(80));
      throw error;
    }
  }

  /**
   * Deposit API - 入款 (派彩)
   * POST /v1/api/seamless/deposit
   */
  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignatureVerificationGuard)
  async deposit(@Body() request: DepositRequestDto): Promise<DepositResponseDto> {
    console.log('='.repeat(80));
    console.log('[GSC+ Deposit API] Request received');
    console.log('Request:', JSON.stringify(request, null, 2));

    try {
      const data = await this.gameProviderGscService.handleDeposit(
        request.batch_requests,
      );

      console.log('[GSC+ Deposit API] Response:', JSON.stringify(data, null, 2));
      console.log('='.repeat(80));

      return { data };
    } catch (error) {
      console.error('[GSC+ Deposit API] Error:', error);
      console.log('='.repeat(80));
      throw error;
    }
  }

  /**
   * Push Bet Data API - 推送注單資料
   * POST /v1/api/seamless/pushbetdata
   */
  @Post('pushbetdata')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignatureVerificationGuard)
  async pushBetData(@Body() request: PushBetDataRequestDto): Promise<PushBetDataResponseDto> {
    console.log('='.repeat(80));
    console.log('[GSC+ PushBetData API] Request received');
    console.log('Request:', JSON.stringify(request, null, 2));

    try {
      await this.gameProviderGscService.handlePushBetData(request.wagers);

      console.log('[GSC+ PushBetData API] Success');
      console.log('='.repeat(80));

      return {
        code: SeamlessWalletCode.SUCCESS,
        message: '',
      };
    } catch (error) {
      console.error('[GSC+ PushBetData API] Error:', error);
      console.log('='.repeat(80));

      return {
        code: SeamlessWalletCode.INTERNAL_ERROR,
        message: 'Internal error',
      };
    }
  }
}
