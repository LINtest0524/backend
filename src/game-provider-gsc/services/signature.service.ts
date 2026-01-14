import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { GSC_CONFIG, SIGNATURE_ACTIONS } from '../constants/gsc.constants';

/**
 * 簽名驗證服務
 * 處理 GSC+ API 的 MD5 簽名生成與驗證
 */
@Injectable()
export class SignatureService {
  /**
   * 生成 MD5 簽名
   * @param data 要簽名的字串
   * @returns MD5 hash (小寫)
   */
  private generateMd5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex').toLowerCase();
  }

  /**
   * 驗證接收到的簽名 (Seamless Wallet API)
   * 遊戲商呼叫我們的 API 時,需要驗證他們的簽名
   * 
   * @param operatorCode 運營商代碼
   * @param requestTime 請求時間戳 (秒)
   * @param action 動作類型 (getbalance, withdraw, deposit, pushbetdata)
   * @param receivedSign 接收到的簽名
   * @returns 是否驗證通過
   */
  verifySeamlessWalletSignature(
    operatorCode: string,
    requestTime: string,
    action: string,
    receivedSign: string,
  ): boolean {
    // 簽名格式: md5(operator_code + request_time + action + secret_key)
    const signString = `${operatorCode}${requestTime}${action}${GSC_CONFIG.SECRET_KEY}`;
    const expectedSign = this.generateMd5(signString);

    console.log('[GSC+ Signature Verify]', {
      operatorCode,
      requestTime,
      action,
      signString,
      expectedSign,
      receivedSign,
      match: expectedSign === receivedSign.toLowerCase(),
    });

    return expectedSign === receivedSign.toLowerCase();
  }

  /**
   * 生成我們呼叫遊戲商 API 的簽名 (Operator API)
   * 我們呼叫遊戲商 API 時,需要生成簽名
   * 
   * @param requestTime 請求時間戳 (秒)
   * @param action 動作類型 (launchgame, getwagers, gamelist, etc.)
   * @param operatorCode 運營商代碼
   * @returns 簽名字串
   */
  generateOperatorSignature(
    requestTime: number,
    action: string,
    operatorCode: string,
  ): string {
    // 簽名格式: md5(request_time + secret_key + action + operator_code)
    const signString = `${requestTime}${GSC_CONFIG.SECRET_KEY}${action}${operatorCode}`;
    const sign = this.generateMd5(signString);

    console.log('[GSC+ Signature Generate]', {
      requestTime,
      action,
      operatorCode,
      signString,
      sign,
    });

    return sign;
  }

  /**
   * 驗證 Balance API 簽名
   */
  verifyBalanceSignature(
    operatorCode: string,
    requestTime: string,
    receivedSign: string,
  ): boolean {
    return this.verifySeamlessWalletSignature(
      operatorCode,
      requestTime,
      SIGNATURE_ACTIONS.GET_BALANCE,
      receivedSign,
    );
  }

  /**
   * 驗證 Withdraw API 簽名
   */
  verifyWithdrawSignature(
    operatorCode: string,
    requestTime: string,
    receivedSign: string,
  ): boolean {
    return this.verifySeamlessWalletSignature(
      operatorCode,
      requestTime,
      SIGNATURE_ACTIONS.WITHDRAW,
      receivedSign,
    );
  }

  /**
   * 驗證 Deposit API 簽名
   */
  verifyDepositSignature(
    operatorCode: string,
    requestTime: string,
    receivedSign: string,
  ): boolean {
    return this.verifySeamlessWalletSignature(
      operatorCode,
      requestTime,
      SIGNATURE_ACTIONS.DEPOSIT,
      receivedSign,
    );
  }

  /**
   * 驗證 Push Bet Data API 簽名
   */
  verifyPushBetDataSignature(
    operatorCode: string,
    requestTime: string,
    receivedSign: string,
  ): boolean {
    return this.verifySeamlessWalletSignature(
      operatorCode,
      requestTime,
      SIGNATURE_ACTIONS.PUSH_BET_DATA,
      receivedSign,
    );
  }

  /**
   * 生成 Launch Game 簽名
   */
  generateLaunchGameSignature(requestTime: number): string {
    return this.generateOperatorSignature(
      requestTime,
      SIGNATURE_ACTIONS.LAUNCH_GAME,
      GSC_CONFIG.OPERATOR_CODE,
    );
  }

  /**
   * 生成 Get Wagers 簽名
   */
  generateGetWagersSignature(requestTime: number): string {
    return this.generateOperatorSignature(
      requestTime,
      SIGNATURE_ACTIONS.GET_WAGERS,
      GSC_CONFIG.OPERATOR_CODE,
    );
  }

  /**
   * 生成 Game List 簽名
   */
  generateGameListSignature(requestTime: number): string {
    return this.generateOperatorSignature(
      requestTime,
      SIGNATURE_ACTIONS.GAME_LIST,
      GSC_CONFIG.OPERATOR_CODE,
    );
  }
}
