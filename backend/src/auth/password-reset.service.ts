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

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly CODE_EXPIRATION_MINUTES = 10;
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private readonly RATE_LIMIT_WINDOW_HOURS = 1;

  constructor(
    private prisma: PrismaService,
    private resendService: ResendService,
    private usersService: UsersService,
  ) {}

  /**
   * Genera un código OTP de 6 dígitos
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Solicita un código de recuperación de contraseña
   * Si ya existe un código para ese email, lo reemplaza
   * Implementa rate limiting: máximo 3 intentos por hora por email
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Verificar que el usuario existe
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      // Simplemente no hacemos nada y retornamos éxito
      return;
    }

    // Verificar rate limiting: contar intentos en la última hora
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
          `Has alcanzado el límite de ${this.MAX_ATTEMPTS_PER_HOUR} solicitudes por hora. Por favor, intenta nuevamente en ${minutesRemaining} minutos.`,
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

    // Generar código OTP de 6 dígitos
    const code = this.generateOTP();

    // Calcular fecha de expiración (10 minutos desde ahora)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRATION_MINUTES);

    // Actualizar o crear el código de recuperación
    if (existingReset) {
      // Actualizar el código existente
      await this.prisma.passwordReset.update({
        where: { email },
        data: {
          code,
          expiresAt,
        },
      });
    } else {
      // Crear un nuevo código
      await this.prisma.passwordReset.create({
        data: {
          email,
          code,
          expiresAt,
          attempts: 1,
          lastAttemptAt: new Date(),
        },
      });
    }

    // Enviar correo con el código usando Resend
    try {
      await this.resendService.sendRecoveryEmail(email, code);
      this.logger.log(`✅ Código de recuperación enviado a ${email}`);
      
      // También mostrar el código en consola para debugging (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`🔑 Código OTP generado: ${code} (expira en ${this.CODE_EXPIRATION_MINUTES} minutos)`);
        this.logger.log(`💡 Si no recibes el correo, usa este código para continuar`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar correo de recuperación a ${email}: ${error.message}`);
      
      // En producción, eliminar el código y lanzar error
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
   * Verifica si un código de recuperación es válido
   */
  async verifyResetCode(email: string, code: string): Promise<boolean> {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { email },
    });

    if (!reset) {
      return false;
    }

    // Verificar que el código coincida
    if (reset.code !== code) {
      return false;
    }

    // Verificar que no haya expirado
    const now = new Date();
    if (reset.expiresAt < now) {
      // Eliminar código expirado
      await this.prisma.passwordReset.delete({
        where: { email },
      }).catch(() => {
        // Ignorar errores al eliminar
      });
      return false;
    }

    return true;
  }

  /**
   * Restablece la contraseña del usuario
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    // Verificar que el código sea válido
    const isValid = await this.verifyResetCode(email, code);
    if (!isValid) {
      throw new UnauthorizedException(
        'Código inválido o expirado. Solicita un nuevo código.',
      );
    }

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

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña del usuario
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Eliminar el código de recuperación (ya fue usado)
    await this.prisma.passwordReset.delete({
      where: { email },
    }).catch(() => {
      // Ignorar errores al eliminar
    });
  }

  /**
   * Limpia códigos expirados (útil para tareas programadas)
   */
  async cleanupExpiredCodes(): Promise<number> {
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

