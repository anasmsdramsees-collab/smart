import { IsOptional, IsString } from 'class-validator';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
