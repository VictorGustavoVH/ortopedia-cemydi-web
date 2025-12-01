import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';

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
   * Implementa rate limiting por email y por IP
   */
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
    @Request() req: any,
  ) {
    // Extraer la IP del cliente (considerando proxies y load balancers)
    const ipAddress = this.getClientIp(req);
    
    await this.passwordResetService.requestPasswordReset(
      requestPasswordResetDto.email,
      ipAddress,
    );
    // Respuesta genérica que no revela si el usuario existe o no
    return {
      message: 'Si el correo existe en nuestro sistema, recibirás un código de recuperación.',
    };
  }

  /**
   * Extrae la IP real del cliente considerando proxies y load balancers
   */
  private getClientIp(req: any): string {
    // Verificar headers de proxies (X-Forwarded-For, X-Real-IP)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For puede contener múltiples IPs, tomar la primera
      const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
      return ips[0];
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Si no hay headers de proxy, usar la IP de la conexión
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Verifica si un token de recuperación es válido
   * Retorna true si el token es válido y no ha expirado
   * Rechaza automáticamente tokens expirados
   */
  @Get('verify-reset-token')
  @HttpCode(HttpStatus.OK)
  async verifyResetToken(@Query('token') token: string) {
    if (!token) {
      return {
        valid: false,
        message: 'Token de recuperación requerido',
      };
    }

    const result = await this.passwordResetService.verifyResetToken(token);

    if (!result.valid) {
      return {
        valid: false,
        message: 'Token inválido o expirado. Los enlaces expiran después de 10 minutos. Solicita un nuevo enlace.',
      };
    }

    return {
      valid: true,
      message: 'Token válido',
      email: result.email,
    };
  }

  /**
   * Restablece la contraseña del usuario usando el token de recuperación
   * Requiere: token y nueva contraseña (mínimo 8 caracteres)
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return {
      message: 'Contraseña actualizada correctamente',
    };
  }

  /**
   * Verifica el correo electrónico del usuario usando el token de verificación
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto.token);
    return {
      message: 'Correo electrónico verificado exitosamente. Ya puedes iniciar sesión.',
    };
  }

  /**
   * Reenvía el correo de verificación
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(resendVerificationDto.email);
    // Respuesta genérica que no revela si el email existe o no
    return {
      message: 'Si el correo existe y no está verificado, recibirás un nuevo correo de verificación.',
    };
  }

  /**
   * Refresca el access token usando un refresh token válido
   * Retorna un nuevo access token y un nuevo refresh token (rotación)
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshAccessToken(refreshTokenDto.refresh_token);
    return tokens;
  }

  /**
   * Cierra sesión y revoca el token JWT actual
   * Invalida el token para que no pueda ser usado nuevamente
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any) {
    // Extraer el token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        message: 'Sesión cerrada',
      };
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    const userId = req.user.userId;

    // Revocar el token
    await this.authService.revokeToken(token, userId);

    return {
      message: 'Sesión cerrada correctamente',
    };
  }

  /**
   * Obtiene el estado de MFA del usuario autenticado
   * Requiere autenticación
   */
  @Get('mfa/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMfaStatus(@Request() req: any) {
    const userId = req.user.userId;
    return await this.authService.getMfaStatus(userId);
  }

  /**
   * Genera un secret TOTP y QR code para configurar MFA
   * Requiere autenticación
   */
  @Get('mfa/generate-secret')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateMfaSecret(@Request() req: any) {
    const userId = req.user.userId;
    const result = await this.authService.generateMfaSecret(userId);
    return {
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
      message: 'Escanea el código QR con tu aplicación autenticadora (Google Authenticator, Microsoft Authenticator, etc.)',
    };
  }

  /**
   * Activa MFA para un usuario después de verificar el código TOTP
   * Requiere autenticación
   * El secret debe haberse generado previamente con /auth/mfa/generate-secret
   */
  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async enableMfa(@Request() req: any, @Body() enableMfaDto: EnableMfaDto) {
    const userId = req.user.userId;
    
    // Activar MFA verificando el código con el secret proporcionado
    await this.authService.enableMfa(userId, enableMfaDto.totpCode, enableMfaDto.secret);
    
    return {
      message: 'MFA activado exitosamente. Ahora necesitarás ingresar un código TOTP cada vez que inicies sesión.',
    };
  }

  /**
   * Desactiva MFA para un usuario
   * Requiere autenticación
   */
  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disableMfa(@Request() req: any) {
    const userId = req.user.userId;
    await this.authService.disableMfa(userId);
    return {
      message: 'MFA desactivado exitosamente',
    };
  }

  /**
   * Verifica el código TOTP durante el login
   * Si el código es inválido, ACCESO DENEGADO
   * Si es válido, retorna los tokens de acceso
   */
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() verifyMfaDto: VerifyMfaDto) {
    return await this.authService.verifyMfa(verifyMfaDto.mfaToken, verifyMfaDto.totpCode);
  }
}
