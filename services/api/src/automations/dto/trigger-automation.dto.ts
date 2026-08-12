import { IsIn, IsOptional } from 'class-validator';

export class TriggerAutomationDto {
  @IsOptional()
  @IsIn(['on', 'off'])
  state?: 'on' | 'off';
}
