/**
 * Utilidad para sanitizar logs y evitar exponer información sensible
 * como contraseñas, tokens, secrets, etc.
 */

/**
 * Campos que deben ser sanitizados en los logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'oldPassword',
  'token',
  'access_token',
  'refresh_token',
  'mfaToken',
  'secret',
  'mfaSecret',
  'verificationToken',
  'resetToken',
  'apiKey',
  'api_key',
  'authorization',
  'authorizationHeader',
  'jwt',
  'jwt_secret',
  'database_url',
  'connection_string',
];

/**
 * Sanitiza un objeto eliminando campos sensibles
 */
export function sanitizeLogObject(obj: any, depth = 0): any {
  // Prevenir recursión infinita
  if (depth > 5) {
    return '[Object demasiado profundo]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Si es un string, verificar si parece ser un token o contraseña
  if (typeof obj === 'string') {
    // Si es muy largo (probablemente un token), sanitizar
    if (obj.length > 50) {
      return '[String sanitizado]';
    }
    return obj;
  }

  // Si es un array, sanitizar cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogObject(item, depth + 1));
  }

  // Si es un objeto, sanitizar recursivamente
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        
        // Si el campo es sensible, reemplazarlo
        if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else {
          // Sanitizar recursivamente
          sanitized[key] = sanitizeLogObject(obj[key], depth + 1);
        }
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitiza un mensaje de error eliminando información sensible
 */
export function sanitizeErrorMessage(error: any): string {
  if (!error) {
    return 'Error desconocido';
  }

  // Si es un string, retornarlo directamente (ya está sanitizado)
  if (typeof error === 'string') {
    return error;
  }

  // Si es un Error, extraer solo el mensaje
  if (error instanceof Error) {
    return error.message || 'Error desconocido';
  }

  // Si es un objeto, sanitizarlo
  if (typeof error === 'object') {
    const sanitized = sanitizeLogObject(error);
    return JSON.stringify(sanitized);
  }

  return String(error);
}

/**
 * Sanitiza un stack trace eliminando información sensible
 * Solo muestra el stack en desarrollo
 */
export function sanitizeStackTrace(error: any): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    return undefined; // No mostrar stack en producción
  }

  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return undefined;
}

/**
 * Sanitiza una URL eliminando tokens y parámetros sensibles
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  try {
    const urlObj = new URL(url);
    // Eliminar parámetros sensibles
    const sensitiveParams = ['token', 'code', 'password', 'secret', 'key', 'api_key'];
    sensitiveParams.forEach((param) => {
      urlObj.searchParams.delete(param);
    });
    return urlObj.toString();
  } catch {
    // Si no es una URL válida, retornar tal cual
    return url;
  }
}

