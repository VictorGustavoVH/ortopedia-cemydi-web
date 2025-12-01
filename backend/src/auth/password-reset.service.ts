import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResendService } from '../common/services/resend.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

/**
 * Número de rounds para bcrypt (cost factor)
 * 10 rounds = 2^10 = 1024 iteraciones
 * IMPORTANTE: bcrypt.hash() genera automáticamente un SALT ÚNICO para cada contraseña
 * El salt está incluido en el hash resultante en formato: $2a$10$[salt][hash]
 */
const BCRYPT_ROUNDS = 10;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly TOKEN_EXPIRATION_MINUTES = 10;
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private readonly MAX_ATTEMPTS_PER_HOUR_BY_IP = 5; // Límite más alto por IP para permitir múltiples usuarios
  private readonly RATE_LIMIT_WINDOW_HOURS = 1;

  constructor(
    private prisma: PrismaService,
    private resendService: ResendService,
    private usersService: UsersService,
  ) {}

  /**
   * Genera un token seguro para recuperación de contraseña
   * Usa 32 bytes de aleatoriedad criptográfica
   */
  private generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Solicita un enlace de recuperación de contraseña
   * Genera un token seguro y envía un enlace por email
   * Si ya existe un token para ese email, lo reemplaza
   * Implementa rate limiting: máximo 3 intentos por hora por email Y máximo 5 por IP
   */
  async requestPasswordReset(email: string, ipAddress: string): Promise<void> {
    // Verificar rate limiting por IP primero (más restrictivo)
    await this.checkIpRateLimit(ipAddress);

    // Verificar que el usuario existe
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      // Simplemente no hacemos nada y retornamos éxito
      return;
    }

    // Verificar rate limiting por email: contar intentos en la última hora
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - this.RATE_LIMIT_WINDOW_HOURS);

    const existingReset = await this.prisma.passwordReset.findUnique({
      where: { email },
    });

    // Si existe un registro y el último intento fue hace menos de una hora
    if (existingReset && existingReset.lastAttemptAt > oneHourAgo) {
      // Verificar si se ha excedido el límite de intentos
      if (existingReset.attempts >= this.MAX_ATTEMPTS_PER_HOUR) {
        const minutesRemaining = Math.ceil(
          (existingReset.lastAttemptAt.getTime() + 60 * 60 * 1000 - Date.now()) / (60 * 1000),
        );
        throw new BadRequestException(
          `Has alcanzado el límite de ${this.MAX_ATTEMPTS_PER_HOUR} solicitudes por hora para este correo. Por favor, intenta nuevamente en ${minutesRemaining} minutos.`,
        );
      }

      // Incrementar contador de intentos
      await this.prisma.passwordReset.update({
        where: { email },
        data: {
          attempts: existingReset.attempts + 1,
          lastAttemptAt: new Date(),
        },
      });
    } else if (existingReset) {
      // Si el último intento fue hace más de una hora, resetear contador
      await this.prisma.passwordReset.update({
        where: { email },
        data: {
          attempts: 1,
          lastAttemptAt: new Date(),
        },
      });
    }

    // Generar token seguro para recuperación
    const token = this.generateResetToken();

    // Calcular fecha de expiración (10 minutos desde ahora)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRATION_MINUTES);

    // Actualizar o crear el token de recuperación
    if (existingReset) {
      // Actualizar el token existente
      await this.prisma.passwordReset.update({
        where: { email },
        data: {
          token,
          expiresAt,
        },
      });
    } else {
      // Crear un nuevo token
      await this.prisma.passwordReset.create({
        data: {
          email,
          token,
          expiresAt,
          attempts: 1,
          lastAttemptAt: new Date(),
        },
      });
    }

    // Enviar correo con el enlace de recuperación usando Resend
    try {
      await this.resendService.sendRecoveryEmail(email, token);
      this.logger.log(`✅ Enlace de recuperación enviado a ${email}`);
      
      // También mostrar el token en consola para debugging (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        this.logger.log(`🔑 Token de recuperación generado: ${token} (expira en ${this.TOKEN_EXPIRATION_MINUTES} minutos)`);
        this.logger.log(`💡 URL de recuperación: ${resetUrl}`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar correo de recuperación a ${email}: ${error.message}`);
      
      // En producción, eliminar el token y lanzar error
      await this.prisma.passwordReset.delete({
        where: { email },
      }).catch(() => {
        // Ignorar errores al eliminar
      });
      
      throw new BadRequestException(
        'No se pudo enviar el correo de recuperación. Verifica que RESEND_API_KEY esté configurada correctamente.',
      );
    }
  }

  /**
   * Verifica si un token de recuperación es válido
   * Rechaza tokens expirados automáticamente
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) {
      return { valid: false };
    }

    // Verificar que no haya expirado PRIMERO (seguridad: rechazar inmediatamente)
    const now = new Date();
    if (reset.expiresAt < now) {
      // Eliminar token expirado automáticamente
      await this.prisma.passwordReset.delete({
        where: { token },
      }).catch(() => {
        // Ignorar errores al eliminar
      });
      this.logger.warn(`Token de recuperación expirado. Expiró el ${reset.expiresAt.toISOString()}`);
      return { valid: false };
    }

    return { valid: true, email: reset.email };
  }

  /**
   * Restablece la contraseña del usuario usando un token
   * Rechaza tokens expirados o inválidos
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    // Verificar que el token sea válido y no esté expirado
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) {
      throw new UnauthorizedException(
        'Token de recuperación no encontrado o inválido. Solicita un nuevo enlace de recuperación.',
      );
    }

    // Verificar expiración ANTES de continuar (seguridad)
    const now = new Date();
    if (reset.expiresAt < now) {
      // Eliminar token expirado
      await this.prisma.passwordReset.delete({
        where: { token },
      }).catch(() => {
        // Ignorar errores al eliminar
      });
      this.logger.warn(`Intento de usar token expirado. Expiró el ${reset.expiresAt.toISOString()}`);
      throw new UnauthorizedException(
        `El enlace de recuperación ha expirado. Los enlaces expiran después de ${this.TOKEN_EXPIRATION_MINUTES} minutos. Solicita un nuevo enlace.`,
      );
    }

    const email = reset.email;

    // Verificar que el usuario existe
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que la nueva contraseña tenga al menos 8 caracteres
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }

    // Validar complejidad de la contraseña (mayúscula, minúscula, número, símbolo)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#)',
      );
    }

    // Hashear la nueva contraseña con bcrypt
    // bcrypt.hash() genera automáticamente un SALT ÚNICO para cada contraseña
    // El salt está incluido en el hash resultante, garantizando que cada contraseña tenga un salt diferente
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Actualizar la contraseña del usuario
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Eliminar el token de recuperación (ya fue usado)
    await this.prisma.passwordReset.delete({
      where: { token },
    }).catch(() => {
      // Ignorar errores al eliminar
    });
  }

  /**
   * Verifica el rate limiting por IP para prevenir abuso
   */
  private async checkIpRateLimit(ipAddress: string): Promise<void> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - this.RATE_LIMIT_WINDOW_HOURS);

    // Buscar intentos recientes desde esta IP
    const ipAttempt = await this.prisma.passwordResetAttempt.findFirst({
      where: {
        ipAddress,
        lastAttemptAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: { lastAttemptAt: 'desc' },
    });

    if (ipAttempt) {
      // Verificar si se ha excedido el límite de intentos por IP
      if (ipAttempt.attempts >= this.MAX_ATTEMPTS_PER_HOUR_BY_IP) {
        const minutesRemaining = Math.ceil(
          (ipAttempt.lastAttemptAt.getTime() + 60 * 60 * 1000 - Date.now()) / (60 * 1000),
        );
        throw new BadRequestException(
          `Has alcanzado el límite de ${this.MAX_ATTEMPTS_PER_HOUR_BY_IP} solicitudes por hora desde esta dirección IP. Por favor, intenta nuevamente en ${minutesRemaining} minutos.`,
        );
      }

      // Incrementar contador de intentos por IP
      await this.prisma.passwordResetAttempt.update({
        where: { id: ipAttempt.id },
        data: {
          attempts: ipAttempt.attempts + 1,
          lastAttemptAt: new Date(),
        },
      });
    } else {
      // Buscar intentos antiguos de esta IP para resetear o crear nuevo
      const oldIpAttempt = await this.prisma.passwordResetAttempt.findFirst({
        where: { ipAddress },
        orderBy: { lastAttemptAt: 'desc' },
      });

      if (oldIpAttempt) {
        // Resetear intentos antiguos
        await this.prisma.passwordResetAttempt.update({
          where: { id: oldIpAttempt.id },
          data: {
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        });
      } else {
        // Crear nuevo registro de intentos por IP
        await this.prisma.passwordResetAttempt.create({
          data: {
            ipAddress,
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Limpia tokens expirados (útil para tareas programadas)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.passwordReset.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
    return result.count;
  }
}

