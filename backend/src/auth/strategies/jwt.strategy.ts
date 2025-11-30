import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Validar que JWT_SECRET esté configurado (obligatorio)
    const secret = configService.get<string>('JWT_SECRET');
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

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Rechazar tokens expirados
      secretOrKey: secret,
      algorithms: ['HS256'], // Algoritmo seguro explícitamente definido
      passReqToCallback: true, // Necesario para acceder al token completo
    });
  }

  async validate(req: any, payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token inválido');
    }

    // Verificar si el token está revocado
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const revoked = await this.prisma.revokedToken.findUnique({
        where: { token },
      });

      if (revoked) {
        throw new UnauthorizedException('Token revocado. Por favor, inicia sesión nuevamente.');
      }
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

