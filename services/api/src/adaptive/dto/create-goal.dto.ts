import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Built-in objectives, plus `custom` for goals the resident writes themselves. */
export const OBJECTIVES = ['comfort', 'energy_saving', 'security', 'sleep', 'custom'] as const;
export type Objective = (typeof OBJECTIVES)[number];

/**
 * One shared constraint vocabulary across every objective. The planner compiles
 * these into device commands, so an objective is just a set of default
 * constraints — a `custom` goal is the same machinery with nothing prefilled.
 */
export const CONSTRAINT_TYPES = [
  'temperature_min',
  'temperature_max',
  'brightness_max',
  'lights_off',
  'blinds_position',
  'doors_locked',
  'switches_off',
] as const;
export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

export class ConstraintDto {
  @IsIn(CONSTRAINT_TYPES as unknown as string[])
  type: ConstraintType;

  /**
   * Number for setpoints and percentages, boolean for the on/off constraints.
   * class-validator has no union validator, so this reads as "if it isn't a
   * boolean it must be a number". The decorators are also what keep the
   * property alive under the global `whitelist: true` ValidationPipe — an
   * undecorated property is silently stripped (see test/create-goal.dto.spec.ts).
   */
  @IsDefined()
  @ValidateIf((o: ConstraintDto) => typeof o.value !== 'boolean')
  @IsNumber()
  value: number | boolean;
}

export class CreateGoalDto {
  @IsIn(OBJECTIVES as unknown as string[])
  objective: Objective;

  /** Resident-facing label. Required for `custom`, optional otherwise. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstraintDto)
  constraints?: ConstraintDto[];

  /** Higher wins when two active goals touch the same device. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  /** Optional daily activation window, e.g. a sleep goal that runs 22:00–07:00. */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'activeFrom must be HH:mm' })
  activeFrom?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'activeTo must be HH:mm' })
  activeTo?: string;
}
