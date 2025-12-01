/**
 * Sanitiza una cadena de texto para prevenir ataques XSS
 * Elimina etiquetas HTML, scripts, eventos y otros vectores de ataque
 * 
 * @param input - Valor a sanitizar
 * @returns Valor sanitizado (sin HTML ni scripts)
 */
export function sanitizeString(input: any): any {
  if (typeof input !== 'string') return input;
  if (!input) return input;

  let sanitized = input;

  // 1. Eliminar etiquetas <script> y contenido (case-insensitive, multiline)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Eliminar etiquetas <iframe>, <embed>, <object> (vectores comunes de XSS)
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

  // 3. Eliminar eventos JavaScript (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // 4. Eliminar javascript: y data: URLs (vectores de XSS)
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // 5. Eliminar cualquier etiqueta HTML restante
  sanitized = sanitized.replace(/<\/?[^>]+(>|$)/g, '');

  // 6. Escapar caracteres HTML especiales que puedan quedar
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // 7. Recortar espacios en blanco
  sanitized = sanitized.trim();

  return sanitized;
}


