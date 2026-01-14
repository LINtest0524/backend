import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SignatureService } from '../services/signature.service';
import { GSC_CONFIG } from '../constants/gsc.constants';

/**
 * 簽名驗證 Guard
 * 用於驗證遊戲商呼叫我們 API 時的簽名
 */
@Injectable()
export class SignatureVerificationGuard implements CanActivate {
  constructor(private readonly signatureService: SignatureService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    console.log('[SignatureVerificationGuard] Request received:', {
      url: request.url,
      method: request.method,
      body,
    });

    // 檢查必要參數
    if (!body.operator_code) {
      console.error('[SignatureVerificationGuard] Missing operator_code');
      throw new BadRequestException('Missing operator_code');
    }

    if (!body.request_time) {
      console.error('[SignatureVerificationGuard] Missing request_time');
      throw new BadRequestException('Missing request_time');
    }

    if (!body.sign) {
      console.error('[SignatureVerificationGuard] Missing sign');
      throw new BadRequestException('Missing sign');
    }

    // 驗證 operator_code
    if (body.operator_code !== GSC_CONFIG.OPERATOR_CODE) {
      console.error('[SignatureVerificationGuard] Invalid operator_code:', {
        received: body.operator_code,
        expected: GSC_CONFIG.OPERATOR_CODE,
      });
      throw new UnauthorizedException('Invalid operator_code');
    }

    // 驗證時間戳 (防止重放攻擊)
    const requestTime = parseInt(body.request_time, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - requestTime);

    // 允許 5 分鐘的時間誤差
    if (timeDiff > 300) {
      console.error('[SignatureVerificationGuard] Request time expired:', {
        requestTime,
        currentTime,
        timeDiff,
      });
      throw new UnauthorizedException('Request time expired');
    }

    // 根據 URL 判斷簽名類型
    let isValid = false;
    const url = request.url;

    if (url.includes('/balance')) {
      isValid = this.signatureService.verifyBalanceSignature(
        body.operator_code,
        body.request_time,
        body.sign,
      );
    } else if (url.includes('/withdraw')) {
      isValid = this.signatureService.verifyWithdrawSignature(
        body.operator_code,
        body.request_time,
        body.sign,
      );
    } else if (url.includes('/deposit')) {
      isValid = this.signatureService.verifyDepositSignature(
        body.operator_code,
        body.request_time,
        body.sign,
      );
    } else if (url.includes('/pushbetdata')) {
      isValid = this.signatureService.verifyPushBetDataSignature(
        body.operator_code,
        body.request_time,
        body.sign,
      );
    } else {
      console.error('[SignatureVerificationGuard] Unknown API endpoint:', url);
      throw new BadRequestException('Unknown API endpoint');
    }

    if (!isValid) {
      console.error('[SignatureVerificationGuard] Invalid signature');
      throw new UnauthorizedException('Invalid signature');
    }

    console.log('[SignatureVerificationGuard] Signature verified successfully');
    return true;
  }
}
