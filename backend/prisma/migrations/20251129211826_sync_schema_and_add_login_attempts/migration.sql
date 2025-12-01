-- AlterTable: Actualizar default de role en users
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'client';

-- AlterTable: Agregar columnas faltantes a password_resets
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: revoked_tokens (si no existe)
CREATE TABLE IF NOT EXISTS "revoked_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: revoked_tokens
CREATE UNIQUE INDEX IF NOT EXISTS "revoked_tokens_token_key" ON "revoked_tokens"("token");
CREATE INDEX IF NOT EXISTS "revoked_tokens_userId_idx" ON "revoked_tokens"("userId");
CREATE INDEX IF NOT EXISTS "revoked_tokens_expiresAt_idx" ON "revoked_tokens"("expiresAt");

-- CreateTable: login_attempts
CREATE TABLE IF NOT EXISTS "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: login_attempts
CREATE INDEX IF NOT EXISTS "login_attempts_email_idx" ON "login_attempts"("email");
CREATE INDEX IF NOT EXISTS "login_attempts_lockedUntil_idx" ON "login_attempts"("lockedUntil");

