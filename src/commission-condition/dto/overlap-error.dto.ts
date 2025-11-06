export interface ConflictCondition {
  id: string;
  name: string;
  agentId: number;
  agentName: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface OverlapErrorDto {
  success: false;
  error: 'OVERLAP_DETECTED';
  message: string;
  conflictConditions: ConflictCondition[];
  suggestions: string[];
  overlapDetails: {
    requestedFrom?: string;
    requestedTo?: string;
    conflictStart: string;
    conflictEnd: string;
  };
}

export interface OverlapCheckDto {
  agentId: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  excludeId?: string; // 更新時排除自己
}