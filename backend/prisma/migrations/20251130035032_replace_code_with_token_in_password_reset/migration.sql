-- Eliminar registros existentes (son temporales y expiran)
DELETE FROM "password_resets";

-- Agregar columna token
ALTER TABLE "password_resets" ADD COLUMN "token" TEXT;

-- Generar tokens para registros existentes (aunque los eliminamos, por si acaso)
-- Como ya eliminamos los registros, esto no es necesario, pero lo dejamos por seguridad
UPDATE "password_resets" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;

-- Hacer token NOT NULL y UNIQUE
ALTER TABLE "password_resets" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_token_key" UNIQUE ("token");

-- Eliminar columna code
ALTER TABLE "password_resets" DROP COLUMN "code";

-- Agregar índices
CREATE INDEX IF NOT EXISTS "password_resets_token_idx" ON "password_resets"("token");
CREATE INDEX IF NOT EXISTS "password_resets_expiresAt_idx" ON "password_resets"("expiresAt");

