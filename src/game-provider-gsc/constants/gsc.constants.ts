/**
 * GSC+ 遊戲供應商常數定義
 */

// Operator 資訊
export const GSC_CONFIG = {
  OPERATOR_CODE: process.env.GSC_OPERATOR_CODE || 'T9H1',
  SECRET_KEY: process.env.GSC_SECRET_KEY || 'GSiBLVjYwuk2BtB2VAuuo7',
  API_URL: process.env.GSC_API_URL || 'https://staging.gsimw.com',
  CURRENCY: process.env.GSC_CURRENCY || 'CNY',
  LANGUAGE_CODE: parseInt(process.env.GSC_LANGUAGE_CODE || '1', 10), // 1 = 繁體中文
};

// Seamless Wallet 錯誤碼
export enum SeamlessWalletCode {
  SUCCESS = 0,
  INTERNAL_ERROR = 999,
  MEMBER_NOT_EXIST = 1000,
  INSUFFICIENT_BALANCE = 1001,
  OPERATOR_KEY_ERROR = 1002,
  DUPLICATE_TRANSACTION = 1003,
  INVALID_SIGNATURE = 1004,
  NO_GAME_LIST = 1005,
  BET_NOT_EXIST = 1006,
  PRODUCT_MAINTAINED = 2000,
}

// Operator API 錯誤碼
export enum OperatorCode {
  SUCCESS = 200,
  INTERNAL_ERROR = 999,
  INVALID_PARAMETER = 10002,
}

// 遊戲類型
export enum GameType {
  SLOT = 'SLOT',
  LIVE_CASINO = 'LIVE_CASINO',
  SPORT_BOOK = 'SPORT_BOOK',
  VIRTUAL_SPORT = 'VIRTUAL_SPORT',
  LOTTERY = 'LOTTERY',
  QIPAI = 'QIPAI',
  P2P = 'P2P',
  FISHING = 'FISHING',
  COCK_FIGHTING = 'COCK_FIGHTING',
  BONUS = 'BONUS',
  ESPORT = 'ESPORT',
  POKER = 'POKER',
  OTHERS = 'OTHERS',
  LIVE_CASINO_PREMIUM = 'LIVE_CASINO_PREMIUM',
}

// 注單狀態
export enum WagerStatus {
  BET = 'BET', // 已下注
  BONUS = 'BONUS', // 多次派彩
  SETTLED = 'SETTLED', // 已結算
  RESETTLED = 'RESETTLED', // 重新結算
  VOID = 'VOID', // 作廢
}

// 注單類型
export enum WagerType {
  NORMAL = 'NORMAL', // 一般下注
  FREEROUND = 'FREEROUND', // 免費旋轉
}

// 交易動作類型
export enum TransactionActionType {
  BET = 'BET', // 下注
  FREEBET = 'FREEBET', // 免費下注
  SETTLED = 'SETTLED', // 結算
  ROLLBACK = 'ROLLBACK', // 回滾
  CANCEL = 'CANCEL', // 取消
  ADJUSTMENT = 'ADJUSTMENT', // 調整
  JACKPOT = 'JACKPOT', // 彩金
  BONUS = 'BONUS', // 獎金
  TIP = 'TIP', // 小費
  PROMO = 'PROMO', // 促銷
  LEADERBOARD = 'LEADERBOARD', // 排行榜獎勵
  BET_PRESERVE = 'BET_PRESERVE', // 保留金額
  PRESERVE_REFUND = 'PRESERVE_REFUND', // 退還保留金額
}

// 平台類型
export enum PlatformType {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  DESKTOP = 'DESKTOP',
}

// 簽名動作類型
export const SIGNATURE_ACTIONS = {
  GET_BALANCE: 'getbalance',
  WITHDRAW: 'withdraw',
  DEPOSIT: 'deposit',
  PUSH_BET_DATA: 'pushbetdata',
  LAUNCH_GAME: 'launchgame',
  GET_WAGERS: 'getwagers',
  GET_WAGER: 'getwager',
  GAME_LIST: 'gamelist',
  PRODUCT_LIST: 'productlist',
};
