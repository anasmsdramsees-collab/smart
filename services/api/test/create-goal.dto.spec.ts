import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateGoalDto } from '../src/adaptive/dto/create-goal.dto';

/**
 * Regression test: main.ts applies a global ValidationPipe with `whitelist: true`,
 * which silently strips any DTO property that has no class-validator decorator at
 * all (as opposed to rejecting it). ConstraintDto.value previously had no
 * decorator, so `AdaptiveService.resolveComfortTarget` would always see
 * `value: undefined` and silently fall back to the default target — every
 * constraint the caller sent would be dropped without any error surfacing.
 */
describe('CreateGoalDto (whitelist stripping regression)', () => {
  it('keeps constraint.value after transform + validate with whitelist semantics', async () => {
    const instance = plainToInstance(CreateGoalDto, {
      objective: 'comfort',
      roomId: 'room-1',
      constraints: [
        { type: 'temperature_min', value: 23 },
        { type: 'temperature_max', value: 25 },
      ],
    });

    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toEqual([]);

    expect(instance.constraints?.[0].value).toBe(23);
    expect(instance.constraints?.[1].value).toBe(25);
  });

  it('rejects a constraint with a non-numeric value instead of silently dropping it', async () => {
    const instance = plainToInstance(CreateGoalDto, {
      objective: 'comfort',
      constraints: [{ type: 'temperature_min', value: 'not-a-number' }],
    });

    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
  });
});
