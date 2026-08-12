import { IsString } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  name: string;
}
