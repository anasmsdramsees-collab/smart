import { IsIn } from 'class-validator';
import { GoalStatus } from '../../database/entities';

export class UpdateGoalDto {
  @IsIn([GoalStatus.ACTIVE, GoalStatus.ABANDONED])
  status: GoalStatus;
}
