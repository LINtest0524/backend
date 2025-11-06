export interface MatchedGroup {
  groupIndex: number;
  groupName: string;
  conditions: {
    minRegistrations: number;
    minActiveMembers: number;
    minValidBets: number;
    minNetRevenue: number;
    requireNegativeProfit: boolean;
  };
}

export interface PlatformRefund {
  platformCode: string;
  platformName: string;
  refundRate: number;
  refundAmount: number;
}

export interface CalculationResult {
  sharePercent: number;
  agentRemitPercent: number;
  platformRefunds: PlatformRefund[];
  fixedCost?: number;
  totalCommission: number;
  netAmount: number;
}

export interface PreviewResultDto {
  success: boolean;
  matchedGroup?: MatchedGroup;
  calculation?: CalculationResult;
  preview?: string;
  reason?: string;
  message?: string;
  suggestions?: string[];
}