export function sanitizeString(input: any): any {
  if (typeof input !== 'string') return input;

  // Eliminar etiquetas <script> completas
  let sanitized = input.replace(/<script.*?>[\s\S]*?<\/script>/gi, '');

  // Eliminar cualquier etiqueta HTML
  sanitized = sanitized.replace(/<\/?[^>]+(>|$)/g, '');

  // Recortar espacios en blanco
  sanitized = sanitized.trim();

  return sanitized;
}


