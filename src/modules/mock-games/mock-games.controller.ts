import { Body, Controller, Get, Post, Query, Param, Res, HttpStatus, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MockGamesService } from './mock-games.service';
import { PlaceBetDto, SessionRequestDto } from './dto';
import type { Response } from 'express';

@Controller('mock-games')
export class MockGamesController {
  constructor(private readonly svc: MockGamesService) {}

  private handleError(error: any, res: Response) {
    console.error('MockGames API Error:', error);
    
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response['code']) {
        return res.status(HttpStatus.BAD_REQUEST).json(response);
      }
    }
    
    // 預設錯誤回應
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
      code: 'INTERNAL_ERROR', 
      message: '系統內部錯誤，請稍後再試' 
    });
  }

  @Get('games')
  listGames(@Res() res: Response) {
    try {
      const result = this.svc.getGames();
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Post('session')
  createSession(@Body() dto: SessionRequestDto, @Res() res: Response) {
    try {
      // 驗證必要參數
      if (!dto.playerId || typeof dto.playerId !== 'string' || dto.playerId.trim().length === 0) {
        throw new BadRequestException({ code: 'INVALID_PLAYER_ID', message: 'playerId 為必填且不能為空' });
      }
      
      if (dto.currency && !['TWD', 'USD'].includes(dto.currency)) {
        throw new BadRequestException({ code: 'INVALID_CURRENCY', message: '不支援的幣別，僅支援 TWD 或 USD' });
      }

      const result = this.svc.createOrGetSession(dto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Get('balance')
  async getBalance(@Query('sessionToken') sessionToken: string, @Res() res: Response) {
    try {
      // 驗證必要參數
      if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim().length === 0) {
        throw new BadRequestException({ code: 'MISSING_SESSION_TOKEN', message: 'sessionToken 為必填參數' });
      }

      const result = await this.svc.getBalance(sessionToken);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('bet')
  async placeBet(@Body() dto: PlaceBetDto & { clientTxnId?: string }, @Request() req, @Res() res: Response) {
    try {
      // 驗證必要參數
      if (!dto.sessionToken || typeof dto.sessionToken !== 'string' || dto.sessionToken.trim().length === 0) {
        throw new BadRequestException({ code: 'MISSING_SESSION_TOKEN', message: 'sessionToken 為必填參數' });
      }
      
      if (!dto.roundId || typeof dto.roundId !== 'string' || dto.roundId.trim().length === 0) {
        throw new BadRequestException({ code: 'MISSING_ROUND_ID', message: 'roundId 為必填參數' });
      }
      
      if (!dto.gameId || !['HI_LO', 'DICE'].includes(dto.gameId)) {
        throw new BadRequestException({ code: 'INVALID_GAME_ID', message: 'gameId 必須為 HI_LO 或 DICE' });
      }
      
      if (typeof dto.betAmount !== 'number' || dto.betAmount <= 0) {
        throw new BadRequestException({ code: 'INVALID_BET_AMOUNT', message: 'betAmount 必須為大於 0 的數字' });
      }
      
      if (!dto.betPayload) {
        throw new BadRequestException({ code: 'MISSING_BET_PAYLOAD', message: 'betPayload 為必填參數' });
      }

      const result = await this.svc.placeBet(dto, req.user.companyId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('settle')
  async settle(@Query('roundId') roundId: string, @Request() req, @Res() res: Response) {
    try {
      // 驗證必要參數
      if (!roundId || typeof roundId !== 'string' || roundId.trim().length === 0) {
        throw new BadRequestException({ code: 'MISSING_ROUND_ID', message: 'roundId 為必填參數' });
      }

      const result = await this.svc.settle(roundId, req.user.companyId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('history/bets')
  async getBetHistory(
    @Query('playerId') playerId: string,
    @Query('limit') limit: string,
    @Query('gameId') gameId: string,
    @Query('status') status: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      console.log('[MOCK-GAMES] getBetHistory params:', { playerId, gameId, status, dateFrom, dateTo, limit });
      
      // 檢查是否至少有一個搜尋條件
      const hasSearchCondition = (playerId && playerId.trim()) || gameId || status || dateFrom || dateTo;
      if (!hasSearchCondition) {
        throw new BadRequestException({ code: 'MISSING_SEARCH_CONDITION', message: '請至少提供一個搜尋條件' });
      }

      const limitNum = limit ? parseInt(limit, 10) : 20;
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 2000) {
        throw new BadRequestException({ code: 'INVALID_LIMIT', message: 'limit 必須是 1-2000 之間的數字' });
      }

      const result = await this.svc.getBetHistory(playerId?.trim() || null, limitNum, gameId, status, dateFrom, dateTo, req.user.companyId);
      console.log('[MOCK-GAMES] getBetHistory result:', { total: result.total, itemsLength: result.items?.length });
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('[MOCK-GAMES] getBetHistory error:', error);
      return this.handleError(error, res);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('history/rounds')
  async getRoundHistory(
    @Query('playerId') playerId: string,
    @Query('limit') limit: string,
    @Query('gameId') gameId: string,
    @Query('finished') finished: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      console.log('[MOCK-GAMES] getRoundHistory params:', { playerId, gameId, finished, dateFrom, dateTo, limit });
      
      // 檢查是否至少有一個搜尋條件
      const hasSearchCondition = (playerId && playerId.trim()) || gameId || finished || dateFrom || dateTo;
      if (!hasSearchCondition) {
        throw new BadRequestException({ code: 'MISSING_SEARCH_CONDITION', message: '請至少提供一個搜尋條件' });
      }

      const limitNum = limit ? parseInt(limit, 10) : 20;
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 2000) {
        throw new BadRequestException({ code: 'INVALID_LIMIT', message: 'limit 必須是 1-2000 之間的數字' });
      }

      const result = await this.svc.getRoundHistory(playerId?.trim() || null, limitNum, gameId, finished, dateFrom, dateTo, req.user.companyId);
      console.log('[MOCK-GAMES] getRoundHistory result:', { total: result.total, itemsLength: result.items?.length });
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error('[MOCK-GAMES] getRoundHistory error:', error);
      return this.handleError(error, res);
    }
  }

  @Get('stats/:playerId')
  async getPlayerStats(
    @Param('playerId') playerId: string,
    @Query('gameId') gameId: string,
    @Res() res: Response,
  ) {
    try {
      // 驗證必要參數
      if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
        throw new BadRequestException({ code: 'MISSING_PLAYER_ID', message: 'playerId 為必填參數' });
      }

      const result = await this.svc.getPlayerStats(playerId, gameId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Post('clear-player/:playerId')
  async clearPlayerData(
    @Param('playerId') playerId: string,
    @Res() res: Response,
  ) {
    try {
      // 驗證必要參數
      if (!playerId || typeof playerId !== 'string' || playerId.trim().length === 0) {
        throw new BadRequestException({ code: 'MISSING_PLAYER_ID', message: 'playerId 為必填參數' });
      }

      const result = await this.svc.clearPlayerData(playerId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }
}