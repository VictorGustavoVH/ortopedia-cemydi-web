import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../common/utils/sanitize.util';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Transform(({ value }) => sanitizeString(value))
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsEmail({}, { message: 'El email debe ser válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
    {
      message:
        'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#)',
    },
  )
  password?: string;
}

