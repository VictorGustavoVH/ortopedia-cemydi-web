import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de protección CSRF
 * 
 * Verifica que las peticiones POST/PUT/PATCH/DELETE provengan del origen esperado
 * mediante validación de headers Origin/Referer.
 * 
 * IMPORTANTE: Esta protección es efectiva cuando se usan tokens JWT en headers
 * (no cookies), ya que los tokens en localStorage no se envían automáticamente
 * como las cookies, reduciendo el riesgo de CSRF.
 * 
 * Protecciones adicionales:
 * - Validación estricta de CORS
 * - Verificación de Origin/Referer headers
 * - Tokens JWT en headers (no cookies) - menos vulnerable a CSRF
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Solo validar métodos que modifican datos (POST, PUT, PATCH, DELETE)
    const methodsToProtect = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    if (!methodsToProtect.includes(req.method)) {
      return next();
    }

    // Permitir peticiones OPTIONS (preflight de CORS)
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Obtener origen esperado desde variables de entorno
    const allowedOrigins: string[] = [];
    
    // Agregar origen de Netlify (hardcodeado para producción)
    allowedOrigins.push('https://modulousuarioproyecto.netlify.app');
    
    // Agregar FRONTEND_URL si está configurado
    if (process.env.FRONTEND_URL) {
      const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
      allowedOrigins.push(...envOrigins);
    }
    
    // En desarrollo, permitir localhost
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000');
      allowedOrigins.push('http://localhost:3001');
    }

    // Obtener Origin o Referer del request
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Si no hay Origin ni Referer, puede ser una petición directa (Postman, curl, etc.)
    // En producción, esto debería ser más estricto
    if (!origin && !referer) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException(
          'Petición rechazada: falta header Origin/Referer. Posible ataque CSRF.',
        );
      }
      // En desarrollo, permitir peticiones sin Origin/Referer (para testing)
      return next();
    }

    // Validar Origin (preferido sobre Referer)
    if (origin) {
      const originUrl = new URL(origin);
      const originBase = `${originUrl.protocol}//${originUrl.host}`;
      
      if (allowedOrigins.includes(originBase) || allowedOrigins.includes(origin)) {
        return next();
      }
    }

    // Validar Referer si no hay Origin
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererBase = `${refererUrl.protocol}//${refererUrl.host}`;
        
        if (allowedOrigins.includes(refererBase) || allowedOrigins.includes(referer)) {
          return next();
        }
      } catch (error) {
        // URL inválida en Referer
        throw new ForbiddenException(
          'Petición rechazada: Referer inválido. Posible ataque CSRF.',
        );
      }
    }

    // Si llegamos aquí, el origen no está permitido
    throw new ForbiddenException(
      `Petición rechazada: origen no permitido. Origin: ${origin || 'N/A'}, Referer: ${referer || 'N/A'}. Posible ataque CSRF.`,
    );
  }
}

