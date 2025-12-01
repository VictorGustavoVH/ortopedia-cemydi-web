import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn'] 
        : ['query', 'error', 'warn', 'info'],
    });
  }

  async onModuleInit() {
    try {
      // En entornos serverless (Vercel), las conexiones se manejan bajo demanda
      // pero podemos hacer una conexión inicial para verificar que todo esté bien
      if (process.env.VERCEL !== '1') {
        await this.$connect();
        this.logger.log('✅ Conectado a la base de datos exitosamente');
      } else {
        // En Vercel, solo verificamos que la URL esté disponible
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL no está configurada');
        }
        this.logger.log('✅ PrismaService listo para usar (conexiones bajo demanda en Vercel)');
      }
    } catch (error: any) {
      this.logger.error('❌ Error al conectar con la base de datos:', error);
      this.logger.error('DATABASE_URL disponible:', !!process.env.DATABASE_URL);
      // En producción, no lanzar el error para permitir que la app inicie
      // Las conexiones fallarán después pero al menos veremos el error en los logs
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('✅ Desconectado de la base de datos');
    } catch (error) {
      this.logger.error('❌ Error al desconectar de la base de datos:', error);
    }
  }
}
