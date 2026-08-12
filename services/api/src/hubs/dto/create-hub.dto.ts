import { IsOptional, IsString } from 'class-validator';

export class CreateHubDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  propertyId?: string;
}
