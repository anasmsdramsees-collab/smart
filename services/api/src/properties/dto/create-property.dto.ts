import { IsOptional, IsString } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}
