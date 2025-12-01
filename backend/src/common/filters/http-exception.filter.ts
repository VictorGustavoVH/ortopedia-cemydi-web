import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { sanitizeErrorMessage, sanitizeStackTrace, sanitizeLogObject } from '../utils/log-sanitizer.util';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage: string;
    
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      // NestJS puede devolver el mensaje como string o como objeto { message: string, error: string }
      if (typeof response === 'string') {
        errorMessage = response;
      } else if (typeof response === 'object' && response !== null) {
        // Extraer el mensaje del objeto de respuesta
        errorMessage = (response as any).message || JSON.stringify(response);
      } else {
        errorMessage = 'Error en la petición';
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    } else {
      errorMessage = 'Error interno del servidor';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Log del error sanitizado (sin información sensible)
    const sanitizedMessage = sanitizeErrorMessage(exception);
    const stack = sanitizeStackTrace(exception);
    
    this.logger.error(
      `${request.method} ${request.url} - ${sanitizedMessage}`,
      stack || undefined,
    );

    response.status(status).json(errorResponse);
  }
}

