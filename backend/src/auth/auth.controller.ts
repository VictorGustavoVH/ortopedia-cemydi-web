import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Get('register')
  getRegisterInfo() {
    return {
      message: 'Este endpoint requiere una petición POST',
      method: 'POST',
      path: '/auth/register',
      body: {
        name: 'string (mínimo 2 caracteres)',
        email: 'string (email válido)',
        password: 'string (mínimo 6 caracteres)',
      },
      note: 'El rol se asigna automáticamente como "user"',
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Solicita un código de recuperación de contraseña
   * Envía un código OTP de 6 dígitos al correo electrónico del usuario
   */
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    await this.passwordResetService.requestPasswordReset(
      requestPasswordResetDto.email,
    );
    return {
      message: 'Código enviado al correo',
      email: requestPasswordResetDto.email,
    };
  }

  /**
   * Verifica si un código de recuperación es válido
   * Retorna true si el código es válido y no ha expirado
   */
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    const isValid = await this.passwordResetService.verifyResetCode(
      verifyResetCodeDto.email,
      verifyResetCodeDto.code,
    );

    if (!isValid) {
      return {
        valid: false,
        message: 'Código inválido o expirado',
      };
    }

    return {
      valid: true,
      message: 'Código válido',
    };
  }

  /**
   * Restablece la contraseña del usuario usando el código de verificación
   * Requiere: email, código OTP y nueva contraseña (mínimo 8 caracteres)
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.newPassword,
    );

    return {
      message: 'Contraseña actualizada correctamente',
    };
  }
}
