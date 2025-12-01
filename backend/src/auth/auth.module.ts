import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordResetService } from './password-reset.service';
import { UsersModule } from '../users/users.module';
import { ResendModule } from '../common/services/resend.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    ResendModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Access token expira en 15 minutos (seguridad: sesiones cortas)
        // Refresh token se maneja por separado con expiración más larga
        const expiresIn = (configService.get<string>('JWT_EXPIRES_IN') || '10m') as StringValue;
        const secret = configService.get<string>('JWT_SECRET');
        
        // Validar que JWT_SECRET esté configurado (obligatorio)
        if (!secret || secret.trim() === '') {
          throw new Error(
            'JWT_SECRET debe estar configurado en las variables de entorno. ' +
            'No se permite usar claves por defecto por razones de seguridad.',
          );
        }

        // Validar que la clave tenga al menos 32 caracteres
        if (secret.length < 32) {
          throw new Error(
            'JWT_SECRET debe tener al menos 32 caracteres por seguridad. ' +
            `Longitud actual: ${secret.length} caracteres.`,
          );
        }

        const signOptions: SignOptions = {
          expiresIn,
        };
        return {
          secret,
          signOptions,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordResetService, JwtStrategy, PrismaService],
  exports: [AuthService, PasswordResetService],
})
export class AuthModule {}
