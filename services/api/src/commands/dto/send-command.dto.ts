import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendCommandDto {
  @IsString()
  capability: string;

  @IsIn(['set', 'toggle', 'trigger'])
  action: string;

  @IsOptional()
  value?: unknown;
}
