import {
  Controller,
  Post,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as UAParser from 'ua-parser-js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {

    const { username, password, company: companyCode } = body;

    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const userAgent = req.headers['user-agent'] || '';

    const parser = new UAParser.UAParser(userAgent);


    const info = parser.getResult();

    const platform = `${info.device.model || info.device.type || 'unknown'} / ${info.os.name} ${info.os.version} / ${info.browser.name} ${info.browser.version}`.trim();


    const result = await this.authService.login(
      username,
      password,
      clientIp,
      platform,
      companyCode,
    );

    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return result;
  }
}
