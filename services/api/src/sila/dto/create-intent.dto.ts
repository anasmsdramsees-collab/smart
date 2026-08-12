import { IsString, MinLength } from 'class-validator';

export class CreateIntentDto {
  @IsString()
  @MinLength(1)
  text: string;
}
