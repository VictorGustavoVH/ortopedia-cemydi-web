import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Verificar si el email ya existe
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Crear el usuario usando el servicio de usuarios
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role: 'client',
    });

    // Generar token JWT
    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    // Buscar usuario por email
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar token JWT
    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
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
}
