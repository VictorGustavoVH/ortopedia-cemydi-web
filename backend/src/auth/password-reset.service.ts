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
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Verificar que el usuario existe
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      // Simplemente no hacemos nada y retornamos éxito
      return;
    }

    // Generar código OTP de 6 dígitos
    const code = this.generateOTP();

    // Calcular fecha de expiración (10 minutos desde ahora)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRATION_MINUTES);

    // Buscar si ya existe un código para este email
    const existingReset = await this.prisma.passwordReset.findUnique({
      where: { email },
    });

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

