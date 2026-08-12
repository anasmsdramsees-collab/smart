import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CapabilityDto {
  @IsString()
  capability: string;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class UpsertDeviceDto {
  // Home Assistant entity_id or other source-system identifier. Used, together with
  // hub_id, as the idempotency key for discovery re-sync (section 19).
  @IsString()
  externalRef: string;

  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsArray()
  @ArrayUnique((c: CapabilityDto) => c.capability)
  @ValidateNested({ each: true })
  @Type(() => CapabilityDto)
  capabilities: CapabilityDto[];
}
