import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsObject, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class AutomationActionDto {
  @IsString()
  deviceId: string;

  @IsString()
  capability: string;

  @IsIn(['set', 'toggle', 'trigger'])
  action: string;

  @IsOptional()
  value?: unknown;
}

export class DayNightDefinitionDto {
  @IsIn(['day_night'])
  type: 'day_night';

  @Matches(TIME_PATTERN, { message: 'dayStart must be HH:mm (24h)' })
  dayStart: string;

  @Matches(TIME_PATTERN, { message: 'nightStart must be HH:mm (24h)' })
  nightStart: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  dayActions: AutomationActionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  nightActions: AutomationActionDto[];
}

export class ManualDefinitionDto {
  @IsIn(['manual'])
  type: 'manual';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions: AutomationActionDto[];

  // Optional: what to do when the user switches the scenario back off. If
  // omitted, the scenario can only be activated, not deactivated (the
  // trigger endpoint rejects a state:'off' request for it).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  offActions?: AutomationActionDto[];
}

// class-validator doesn't have a clean built-in discriminated-union validator
// for this NestJS version, so `definition` is accepted as a plain object here
// and the specific shape (day_night vs manual) is checked in
// AutomationsService, which throws BadRequestException on a malformed one.
export class CreateAutomationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsObject()
  definition: DayNightDefinitionDto | ManualDefinitionDto;
}
