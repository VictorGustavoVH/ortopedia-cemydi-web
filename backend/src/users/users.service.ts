import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

/**
 * Número de rounds para bcrypt (cost factor)
 * 10 rounds = 2^10 = 1024 iteraciones
 * Balance entre seguridad y rendimiento
 * IMPORTANTE: bcrypt.hash() genera automáticamente un SALT ÚNICO para cada contraseña
 * El salt está incluido en el hash resultante en formato: $2a$10$[salt][hash]
 */
const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Verificar si el email ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Cifrar la contraseña con bcrypt
    // bcrypt.hash() genera automáticamente un SALT ÚNICO para cada contraseña
    // El salt está incluido en el hash resultante, garantizando que cada contraseña tenga un salt diferente
    const hashedPassword = await bcrypt.hash(createUserDto.password, BCRYPT_ROUNDS);

    // Crear el usuario
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role || 'client',
      },
    });

    // Eliminar la contraseña del objeto de retorno
    const { password, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId?: string) {
    // Verificar si el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Si se intenta cambiar el rol en este endpoint, rechazar
    // El rol solo se puede cambiar mediante PATCH /users/:id/role
    if ((updateUserDto as any).role !== undefined) {
      throw new BadRequestException(
        'Para cambiar el rol de un usuario, utiliza el endpoint PATCH /users/:id/role',
      );
    }

    // Si se está actualizando el email, verificar que no esté en uso
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    // Si se está actualizando la contraseña, cifrarla
    const updateData: any = { ...updateUserDto };
    // Eliminar role si viene (no debería, pero por seguridad)
    delete updateData.role;
    
    if (updateUserDto.password) {
      // bcrypt genera automáticamente un SALT ÚNICO para cada nueva contraseña
      updateData.password = await bcrypt.hash(updateUserDto.password, BCRYPT_ROUNDS);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Usuario actualizado exitosamente',
      user: updatedUser,
    };
  }

  async remove(id: string, currentUserId: string) {
    // Verificar si el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Un administrador no puede eliminarse a sí mismo
    if (id === currentUserId) {
      throw new ForbiddenException('No puedes eliminarte a ti mismo');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: `Usuario con ID ${id} eliminado exitosamente` };
  }

  /**
   * Actualiza el rol de un usuario
   * Solo puede ser llamado por un administrador
   */
  async updateRole(id: string, newRole: 'admin' | 'client', currentUserId: string) {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Validar que el rol sea válido
    if (newRole !== 'admin' && newRole !== 'client') {
      throw new BadRequestException('El rol debe ser "admin" o "client"');
    }

    // Un usuario no puede cambiar su propio rol
    if (id === currentUserId) {
      throw new ForbiddenException('No puedes cambiar tu propio rol');
    }

    // Actualizar el rol
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: `Rol del usuario actualizado a "${newRole}"`,
      user: updatedUser,
    };
  }

  /**
   * Actualiza el perfil del usuario autenticado
   * Solo puede modificar name, email y password (no role)
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Si se está actualizando el email, verificar que no esté en uso por otro usuario
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (updateProfileDto.name) {
      updateData.name = updateProfileDto.name.trim();
    }

    if (updateProfileDto.email) {
      updateData.email = updateProfileDto.email.trim();
    }

    // Si se proporciona una nueva contraseña, cifrarla
    // bcrypt genera automáticamente un SALT ÚNICO para cada nueva contraseña
    if (updateProfileDto.password) {
      updateData.password = await bcrypt.hash(updateProfileDto.password, BCRYPT_ROUNDS);
    }

    // Actualizar el usuario
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Perfil actualizado correctamente.',
      user: updatedUser,
    };
  }
}
