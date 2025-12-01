import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard para control de acceso basado en roles (RBAC)
 * 
 * Este guard verifica que el usuario autenticado tenga uno de los roles requeridos
 * para acceder a un endpoint específico.
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * async someEndpoint() { ... }
 * 
 * IMPORTANTE: Este guard debe usarse DESPUÉS de JwtAuthGuard para asegurar
 * que el usuario esté autenticado y el objeto 'user' esté disponible en el request.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos del decorador @Roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitir acceso (endpoint público o solo requiere autenticación)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener el usuario del request (inyectado por JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario (no autenticado), el JwtAuthGuard ya habría bloqueado
    // Pero por seguridad adicional, verificamos aquí también
    if (!user) {
      this.logger.warn(`Intento de acceso sin autenticación a ${request.method} ${request.url}`);
      throw new ForbiddenException('Acceso denegado: usuario no autenticado');
    }

    // Verificar que el usuario tenga un rol asignado
    if (!user.role) {
      this.logger.warn(`Usuario ${user.userId || user.email} sin rol asignado intentó acceder a ${request.method} ${request.url}`);
      throw new ForbiddenException('Acceso denegado: usuario sin rol asignado');
    }

    // Verificar si el usuario tiene uno de los roles requeridos
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `Usuario con rol "${user.role}" intentó acceder a ${request.method} ${request.url} que requiere roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Acceso denegado: se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}. Tu rol actual es: ${user.role}`,
      );
    }

    // Usuario tiene el rol requerido, permitir acceso
    return true;
  }
}

