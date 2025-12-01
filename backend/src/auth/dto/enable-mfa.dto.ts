import { IsString, Length } from 'class-validator';

export class EnableMfaDto {
  @IsString()
  secret: string;

  @IsString()
  @Length(6, 6, { message: 'El código TOTP debe tener 6 dígitos' })
  totpCode: string;
}

