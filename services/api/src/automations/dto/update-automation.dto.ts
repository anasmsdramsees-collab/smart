import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAutomationDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
