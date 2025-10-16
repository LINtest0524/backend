export class CheckinResponseDto {
  success: boolean;
  message: string;
  data?: {
    day_number: number;
    reward_type: string;
    reward_value: number;
    reward_description: string;
    consecutive_days: number;
    total_checkins: number;
  };
}

export class CheckinStatusDto {
  can_checkin: boolean;
  consecutive_days: number;
  total_checkins: number;
  last_checkin_date: Date | null;
  today_checked: boolean;
  next_reward?: {
    day_number: number;
    reward_type: string;
    reward_value: number;
    reward_description: string;
  } | null;
  checkin_configs: Array<{
    day_number: number;
    reward_type: string;
    reward_value: number;
    reward_description: string;
    is_completed: boolean;
  }>;
}