import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Cargar variables de entorno antes de que Prisma las lea
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
