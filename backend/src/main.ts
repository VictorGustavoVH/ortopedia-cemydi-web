import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { sanitizeErrorMessage } from './common/utils/log-sanitizer.util';

// Cargar variables de entorno antes de que Prisma se inicialice
config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS para permitir peticiones desde el frontend
  // Configuración estricta para prevenir CSRF
  const allowedOrigins: string[] = [];
  
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
  
  // Eliminar duplicados
  const uniqueOrigins = [...new Set(allowedOrigins.filter(Boolean))];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (mobile apps, Postman en desarrollo)
      if (!origin) {
        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('No se permite peticiones sin origin en producción'));
        }
        return callback(null, true);
      }
      
      // Validar contra lista de orígenes permitidos
      if (uniqueOrigins.length === 0 || uniqueOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('⚠️ Origen bloqueado por CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Permitir cookies si se usan en el futuro
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Referer'],
    exposedHeaders: [],
    maxAge: 86400, // Cache preflight por 24 horas
  });
  
  // Configurar headers de seguridad para prevenir XSS, CSRF y otros ataques
  app.use((req, res, next) => {
    // Content Security Policy (CSP) - previene XSS
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; ` +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'; ` + // unsafe-inline/eval necesario para algunas librerías
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
      `font-src 'self' https://fonts.gstatic.com; ` +
      `img-src 'self' data: https:; ` +
      `connect-src 'self' ${frontendUrl} ${process.env.API_URL || 'http://localhost:4000'} https://*.vercel.app https://*.netlify.app; ` +
      `frame-ancestors 'none'; ` +
      `base-uri 'self'; ` +
      `form-action 'self';`
    );
    
    // Strict-Transport-Security (HSTS) - fuerza HTTPS en producción
    // Solo aplicar en producción y cuando se use HTTPS
    if (process.env.NODE_ENV === 'production' && req.secure) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload' // 1 año
      );
    }
    
    // X-Content-Type-Options - previene MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options - previene clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection - protección adicional contra XSS (legacy, pero útil)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer-Policy - controla qué información del referrer se envía
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions-Policy - controla qué características del navegador están disponibles
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );
    
    // X-DNS-Prefetch-Control - controla el prefetch de DNS
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    next();
  });
  
  // Aplicar filtro global de excepciones para mejor manejo de errores
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Aplicar middleware global de logs
  app.use(new LoggerMiddleware().use.bind(new LoggerMiddleware()));
  
  // Habilitar validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => 
          Object.values(error.constraints || {}).join(', ')
        ).join('; ');
        return new ValidationPipe().createExceptionFactory()(errors);
      },
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`🚀 Aplicación corriendo en http://localhost:${port}`);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`❌ Error al iniciar la aplicación: ${sanitizeErrorMessage(error)}`);
  process.exit(1);
});
