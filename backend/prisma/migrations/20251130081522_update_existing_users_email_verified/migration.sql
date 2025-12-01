-- Actualizar todos los usuarios existentes para marcarlos como verificados
-- Esto es necesario porque las cuentas creadas antes de implementar la verificación
-- deben poder iniciar sesión sin problemas
UPDATE "users" SET "emailVerified" = true WHERE "emailVerified" = false;
