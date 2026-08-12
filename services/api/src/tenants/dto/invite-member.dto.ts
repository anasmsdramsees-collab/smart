import { IsEmail, IsEnum } from 'class-validator';
import { RoleName } from '../../database/entities';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(RoleName)
  role: RoleName;
}
