/**
 * Vercel serverless function handler for NestJS
 * Este archivo es el punto de entrada para Vercel
 */

import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import express from 'express';

// Cargar variables de entorno antes de que Prisma se inicialice
// En Vercel, las variables están disponibles pero dotenv las carga si existen en .env.local
config();

// Cache de la aplicación para reutilizar entre invocaciones
let cachedApp: any = null;

async function bootstrap() {
  // Si ya tenemos la app en caché, la reutilizamos
  if (cachedApp) {
    return cachedApp;
  }

  try {
    console.log('🚀 Inicializando aplicación NestJS en Vercel...');
    
    // Verificar variables críticas
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurada. Verifica las variables de entorno en Vercel.');
    }
    
    // Crear instancia de Express
    const expressApp = express();
    
    // Crear aplicación NestJS con Express adapter
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      logger: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn'] 
        : ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Configurar CORS - permitir múltiples orígenes
    const allowedOrigins: string[] = [];
    
    // Agregar origen de Netlify
    allowedOrigins.push('https://modulousuarioproyecto.netlify.app');
    
    // Agregar orígenes desde variable de entorno si existe
    if (process.env.FRONTEND_URL) {
      const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
      allowedOrigins.push(...envOrigins);
    }
    
    // En desarrollo, permitir localhost
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000');
      allowedOrigins.push('http://localhost:3001');
    }
    
    // Eliminar duplicados y vacíos
    const uniqueOrigins = [...new Set(allowedOrigins.filter(Boolean))];
    
    console.log('🌐 Orígenes CORS permitidos:', uniqueOrigins);
      
    app.enableCors({
      origin: (origin, callback) => {
        // Permitir requests sin origin (mobile apps, Postman, etc.)
        if (!origin) {
          return callback(null, true);
        }
        
        // Si no hay orígenes configurados, permitir todos (solo en desarrollo)
        if (uniqueOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        
        if (uniqueOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn('⚠️ Origen bloqueado por CORS:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Configurar headers de seguridad para prevenir XSS, CSRF y otros ataques
    app.use((req, res, next) => {
      // Content Security Policy (CSP) - previene XSS
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.setHeader(
        'Content-Security-Policy',
        `default-src 'self'; ` +
        `script-src 'self' 'unsafe-inline' 'unsafe-eval'; ` +
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
        `font-src 'self' https://fonts.gstatic.com; ` +
        `img-src 'self' data: https:; ` +
        `connect-src 'self' ${frontendUrl} ${process.env.API_URL || 'http://localhost:4000'} https://*.vercel.app https://*.netlify.app; ` +
        `frame-ancestors 'none'; ` +
        `base-uri 'self'; ` +
        `form-action 'self';`
      );
      
      // Strict-Transport-Security (HSTS) - fuerza HTTPS en producción
      if (process.env.NODE_ENV === 'production' && req.secure) {
        res.setHeader(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload'
        );
      }
      
      // X-Content-Type-Options - previene MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // X-Frame-Options - previene clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // X-XSS-Protection - protección adicional contra XSS
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Referrer-Policy - controla qué información del referrer se envía
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Permissions-Policy - controla características del navegador
      res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
      );
      
      // X-DNS-Prefetch-Control - controla el prefetch de DNS
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      
      next();
    });

    // Aplicar filtro global de excepciones
    app.useGlobalFilters(new AllExceptionsFilter());

    // Habilitar validaciones globales
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Inicializar la aplicación
    await app.init();
    
    console.log('✅ Aplicación NestJS inicializada correctamente');

    // Guardar en caché
    cachedApp = expressApp;

    return expressApp;
  } catch (error: any) {
    console.error('❌ Error al inicializar aplicación:', error);
    console.error('Stack:', error.stack);
    // Limpiar caché en caso de error para intentar de nuevo en la próxima invocación
    cachedApp = null;
    throw error;
  }
}

// Exportar el handler para Vercel
export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrap();
    return app(req, res);
  } catch (error: any) {
    console.error('❌ Error en handler de Vercel:', error);
    console.error('Stack:', error.stack);
    
    // Verificar si DATABASE_URL está disponible
    if (!process.env.DATABASE_URL) {
      console.error('⚠️ DATABASE_URL no está disponible en las variables de entorno');
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    });
  }
}

