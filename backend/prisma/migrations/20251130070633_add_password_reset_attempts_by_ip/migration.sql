-- CreateTable
CREATE TABLE "password_reset_attempts" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_attempts_ipAddress_idx" ON "password_reset_attempts"("ipAddress");

-- CreateIndex
CREATE INDEX "password_reset_attempts_lastAttemptAt_idx" ON "password_reset_attempts"("lastAttemptAt");
