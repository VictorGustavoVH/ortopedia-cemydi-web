import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResendService } from '../common/services/resend.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { sanitizeErrorMessage, sanitizeStackTrace } from '../common/utils/log-sanitizer.util';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;
  private readonly ATTEMPT_WINDOW_MINUTES = 15;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private resendService: ResendService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Verificar si el email ya existe
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Crear el usuario usando el servicio de usuarios (emailVerified = false por defecto)
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role: 'client',
    });

    // Generar token de verificación de email
    const verificationToken = this.generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira en 24 horas

    // Guardar token de verificación en la base de datos
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    // Enviar correo de verificación
    try {
      await this.resendService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken,
      );
      // Log de éxito (sin información sensible)
      this.logger.log(`✅ Correo de verificación enviado exitosamente a ${user.email}`);
      
      // Solo en desarrollo, mostrar token para pruebas
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`🔑 Token de verificación (solo desarrollo): ${verificationToken}`);
      }
    } catch (error: any) {
      // Log del error sanitizado (sin información sensible)
      this.logger.error(`❌ Error al enviar correo de verificación a ${user.email}`);
      this.logger.error(`   Mensaje: ${sanitizeErrorMessage(error)}`);
      
      // Solo mostrar stack en desarrollo
      const stack = sanitizeStackTrace(error);
      if (stack) {
        this.logger.debug(`   Stack: ${stack}`);
      }
      
      // NO eliminar el usuario - permitir que intente reenviar el correo
      // Solo eliminar el token de verificación para que pueda generar uno nuevo
      await this.prisma.emailVerification.deleteMany({
        where: { userId: user.id },
      }).catch(() => {});
      
      // En desarrollo, no lanzar error - permitir que el usuario se registre
      // y pueda usar el endpoint de reenvío
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn('⚠️ No se pudo enviar el correo, pero el usuario fue creado.');
        this.logger.warn('   El usuario puede usar /auth/resend-verification para reenviar el correo.');
        // En desarrollo, mostrar el token en la respuesta para facilitar pruebas
        return {
          message: `Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para poder iniciar sesión. ${error.message ? `(Error al enviar correo: ${error.message})` : ''}`,
          email: user.email,
          // Solo en desarrollo, incluir el token para pruebas
          ...(process.env.NODE_ENV !== 'production' && {
            verificationToken,
            note: 'En desarrollo: Usa este token para verificar el email manualmente',
          }),
        };
      }
      
      // En producción, lanzar error
      throw new BadRequestException(
        `No se pudo enviar el correo de verificación. ${error.message || 'Por favor, intenta nuevamente o contacta al administrador.'}`,
      );
    }

    // NO retornar token de acceso - el usuario debe verificar su email primero
    return {
      message: 'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para poder iniciar sesión.',
      email: user.email,
    };
  }

  async login(loginDto: LoginDto) {
    // Verificar protección contra fuerza bruta
    await this.checkBruteForceProtection(loginDto.email);

    // Buscar usuario por email
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      // Registrar intento fallido incluso si el usuario no existe (por seguridad)
      await this.recordFailedLoginAttempt(loginDto.email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el email está verificado
    if (!user.emailVerified) {
      // Registrar intento fallido (por seguridad, no revelar que el email no está verificado)
      await this.recordFailedLoginAttempt(loginDto.email);
      throw new UnauthorizedException(
        'Debes verificar tu correo electrónico antes de poder iniciar sesión. Revisa tu bandeja de entrada.',
      );
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      // Registrar intento fallido
      await this.recordFailedLoginAttempt(loginDto.email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Login exitoso: resetear intentos fallidos
    await this.resetLoginAttempts(loginDto.email);

    // Si MFA está activado, NO generar tokens todavía - requerir código TOTP
    if (user.mfaEnabled) {
      // Generar token temporal para verificar MFA (expira en 5 minutos)
      const mfaToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          mfaPending: true,
        },
        { expiresIn: '5m' },
      );

      // Retornar que se requiere MFA - ACCESO DENEGADO hasta verificar código TOTP
      return {
        requiresMfa: true,
        mfaToken: mfaToken,
        message: 'Ingresa el código de tu aplicación autenticadora para completar el inicio de sesión',
      };
    }

    // Si NO tiene MFA activado, generar tokens normalmente
    // Generar access token (expira en 15 minutos)
    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Generar refresh token (expira en 7 días)
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7);

    // Guardar refresh token en la base de datos
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    // Limpiar refresh tokens expirados del usuario
    await this.cleanExpiredRefreshTokens(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Verifica si la cuenta está bloqueada por intentos fallidos
   */
  private async checkBruteForceProtection(email: string): Promise<void> {
    const loginAttempt = await this.prisma.loginAttempt.findFirst({
      where: { email },
      orderBy: { lastAttemptAt: 'desc' },
    });

    if (!loginAttempt) {
      return; // No hay intentos previos
    }

    // Verificar si la cuenta está bloqueada
    if (loginAttempt.lockedUntil && loginAttempt.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (loginAttempt.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en ${minutesRemaining} minutos.`,
      );
    }

    // Si el bloqueo expiró, verificar si los intentos están dentro de la ventana de tiempo
    const attemptWindow = new Date();
    attemptWindow.setMinutes(attemptWindow.getMinutes() - this.ATTEMPT_WINDOW_MINUTES);

    if (loginAttempt.lastAttemptAt < attemptWindow) {
      // Los intentos son muy antiguos, resetear
      await this.resetLoginAttempts(email);
      return;
    }

    // Verificar si se ha excedido el límite de intentos
    if (loginAttempt.attempts >= this.MAX_LOGIN_ATTEMPTS) {
      // Bloquear la cuenta
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

      await this.prisma.loginAttempt.update({
        where: { id: loginAttempt.id },
        data: { lockedUntil },
      });

      throw new UnauthorizedException(
        `Cuenta bloqueada por ${this.LOCKOUT_DURATION_MINUTES} minutos debido a múltiples intentos fallidos.`,
      );
    }
  }

  /**
   * Registra un intento de login fallido
   */
  private async recordFailedLoginAttempt(email: string): Promise<void> {
    const attemptWindow = new Date();
    attemptWindow.setMinutes(attemptWindow.getMinutes() - this.ATTEMPT_WINDOW_MINUTES);

    const existingAttempt = await this.prisma.loginAttempt.findFirst({
      where: {
        email,
        lastAttemptAt: {
          gte: attemptWindow,
        },
      },
      orderBy: { lastAttemptAt: 'desc' },
    });

    if (existingAttempt) {
      // Incrementar intentos dentro de la ventana de tiempo
      await this.prisma.loginAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          attempts: existingAttempt.attempts + 1,
          lastAttemptAt: new Date(),
        },
      });
    } else {
      // Crear nuevo registro o actualizar uno antiguo
      const oldAttempt = await this.prisma.loginAttempt.findFirst({
        where: { email },
        orderBy: { lastAttemptAt: 'desc' },
      });

      if (oldAttempt) {
        // Resetear intentos antiguos
        await this.prisma.loginAttempt.update({
          where: { id: oldAttempt.id },
          data: {
            attempts: 1,
            lastAttemptAt: new Date(),
            lockedUntil: null,
          },
        });
      } else {
        // Crear nuevo registro
        await this.prisma.loginAttempt.create({
          data: {
            email,
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Resetea los intentos de login fallidos después de un login exitoso
   */
  private async resetLoginAttempts(email: string): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({
      where: { email },
    });
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  /**
   * Revoca un token JWT agregándolo a la lista de tokens revocados
   * También actualiza lastLogoutAt del usuario para invalidar todas las sesiones activas
   */
  async revokeToken(token: string, userId: string): Promise<void> {
    // Decodificar el token para obtener la fecha de expiración
    const decoded = this.jwtService.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return; // Token inválido, no hacer nada
    }

    const expiresAt = new Date(decoded.exp * 1000); // exp está en segundos

    // Agregar a la lista de tokens revocados
    await this.prisma.revokedToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    // Actualizar lastLogoutAt del usuario para invalidar TODAS las sesiones activas
    // Todos los tokens emitidos antes de este momento serán rechazados
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogoutAt: new Date() },
    });

    // Revocar todos los refresh tokens del usuario
    await this.revokeAllRefreshTokens(userId);

    // Limpiar tokens expirados (opcional, puede hacerse en un cron job)
    await this.prisma.revokedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Verifica si un token está revocado
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    const revoked = await this.prisma.revokedToken.findUnique({
      where: { token },
    });

    return revoked !== null;
  }

  /**
   * Genera un refresh token aleatorio seguro
   */
  private generateRefreshToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Refresca el access token usando un refresh token válido
   */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    // Buscar el refresh token en la base de datos
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Verificar que el refresh token no haya expirado
    if (tokenRecord.expiresAt < new Date()) {
      // Eliminar el token expirado
      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new UnauthorizedException('Refresh token expirado. Por favor, inicia sesión nuevamente.');
    }

    // Obtener el usuario
    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Generar nuevo access token
    const payload = { email: user.email, sub: user.id, role: user.role };
    const newAccessToken = this.jwtService.sign(payload);

    // Generar nuevo refresh token (rotación de tokens)
    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenExpiresAt = new Date();
    newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + 7);

    // Actualizar el refresh token en la base de datos
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: newRefreshToken,
        expiresAt: newRefreshTokenExpiresAt,
      },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  /**
   * Revoca un refresh token (útil para logout)
   */
  async revokeRefreshToken(refreshToken: string, userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
        userId,
      },
    });
  }

  /**
   * Limpia todos los refresh tokens expirados de un usuario
   */
  private async cleanExpiredRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Revoca todos los refresh tokens de un usuario (útil para logout completo)
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Genera un token de verificación de email seguro
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verifica el email del usuario usando el token de verificación
   */
  async verifyEmail(token: string): Promise<void> {
    // Buscar el token de verificación
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification) {
      throw new BadRequestException('Token de verificación inválido');
    }

    // Verificar que no haya expirado
    if (verification.expiresAt < new Date()) {
      // Eliminar token expirado
      await this.prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      throw new BadRequestException('El token de verificación ha expirado. Solicita uno nuevo.');
    }

    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: verification.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el email no esté ya verificado
    if (user.emailVerified) {
      // Eliminar token ya que ya fue usado
      await this.prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      throw new BadRequestException('Este correo electrónico ya está verificado');
    }

    // Marcar el email como verificado
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });

    // Eliminar el token de verificación (ya fue usado)
    await this.prisma.emailVerification.delete({
      where: { id: verification.id },
    });
  }

  /**
   * Reenvía el correo de verificación
   */
  async resendVerificationEmail(email: string): Promise<void> {
    // Buscar el usuario
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return;
    }

    // Verificar si el email ya está verificado
    if (user.emailVerified) {
      throw new BadRequestException('Este correo electrónico ya está verificado');
    }

    // Eliminar token de verificación anterior si existe
    await this.prisma.emailVerification.deleteMany({
      where: { userId: user.id },
    });

    // Generar nuevo token de verificación
    const verificationToken = this.generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira en 24 horas

    // Guardar nuevo token de verificación
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    // Enviar correo de verificación
    await this.resendService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
    );
  }

  /**
   * Obtiene el estado de MFA para un usuario
   */
  async getMfaStatus(userId: string): Promise<{ mfaEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return { mfaEnabled: user.mfaEnabled || false };
  }

  /**
   * Genera un secret TOTP y QR code para configurar MFA
   * El usuario debe escanear el QR con su app autenticadora
   */
  async generateMfaSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si MFA ya está activado
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA ya está activado para este usuario. No puedes generar un nuevo secret.');
    }

    // Generar secret TOTP
    const secret = speakeasy.generateSecret({
      name: `Ortopedia CEMYDI (${user.email})`,
      issuer: 'Ortopedia CEMYDI',
      length: 32,
    });

    // Generar QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32!, // Guardar en base32 para verificación
      qrCodeUrl,
    };
  }

  /**
   * Activa MFA para un usuario después de verificar que el código TOTP es válido
   * El secret debe ser el mismo que se generó con generateMfaSecret
   */
  async enableMfa(userId: string, totpCode: string, secret: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA ya está activado para este usuario');
    }

    if (!secret) {
      throw new BadRequestException('Secret es requerido para activar MFA');
    }

    // Verificar que el código TOTP es válido antes de activar
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: totpCode,
      window: 2, // Permitir ±1 minuto de diferencia
    });

    if (!isValid) {
      throw new BadRequestException('Código TOTP inválido. Por favor, verifica el código de tu aplicación autenticadora.');
    }

    // Activar MFA y guardar el secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });
  }

  /**
   * Desactiva MFA para un usuario
   */
  async disableMfa(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaEnabled: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA no está activado para este usuario');
    }

    // Desactivar MFA y eliminar el secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });
  }

  /**
   * Verifica el código TOTP durante el login y genera tokens si es válido
   * Si el código es inválido, ACCESO DENEGADO
   */
  async verifyMfa(mfaToken: string, totpCode: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: { id: string; name: string; email: string; role: string };
  }> {
    // Verificar que el token temporal es válido
    let payload: any;
    try {
      payload = this.jwtService.verify(mfaToken);
    } catch (error) {
      throw new UnauthorizedException('Token MFA inválido o expirado. Por favor, inicia sesión nuevamente.');
    }

    if (!payload.mfaPending) {
      throw new UnauthorizedException('Token inválido');
    }

    // Buscar usuario con campos MFA
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        mfaSecret: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA no está configurado para este usuario');
    }

    // Verificar código TOTP
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: totpCode,
      window: 2, // Permitir ±1 minuto de diferencia
    });

    // Si el código es inválido, ACCESO DENEGADO
    if (!isValid) {
      throw new UnauthorizedException('Código TOTP inválido. Acceso denegado.');
    }

    // Código válido: generar tokens de acceso
    const tokenPayload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(tokenPayload);

    // Generar refresh token (expira en 7 días)
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7);

    // Guardar refresh token en la base de datos
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    // Limpiar refresh tokens expirados del usuario
    await this.cleanExpiredRefreshTokens(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
