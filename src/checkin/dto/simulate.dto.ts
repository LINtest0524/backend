import { IsInt, IsDateString } from 'class-validator';

export class SimulateDto {
  @IsInt()
  userId: number;

  @IsDateString()
  today: string;
}