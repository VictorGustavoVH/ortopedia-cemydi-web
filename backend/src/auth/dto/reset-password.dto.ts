import { IsEmail, IsNotEmpty, IsString, MinLength, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  code: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
    message:
      'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#)',
  })
  newPassword: string;
}

