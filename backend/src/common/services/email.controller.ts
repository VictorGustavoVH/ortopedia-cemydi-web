import { Controller, Get, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ResendService } from './resend.service';

@Controller('email')
export class EmailController {
  constructor(private readonly resendService: ResendService) {}

  /**
   * Endpoint de prueba para verificar la configuración de Resend
   * Solo disponible en desarrollo (NODE_ENV !== 'production')
   * 
   * Uso: GET /email/test?to=tu-email@ejemplo.com
   */
  @Get('test')
  async sendTestEmail(@Query('to') to?: string) {
    // Verificar que estamos en desarrollo
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException(
        'Este endpoint solo está disponible en desarrollo',
        HttpStatus.FORBIDDEN,
      );
    }

    // Verificar que se proporcionó un email
    if (!to) {
      throw new HttpException(
        'Debes proporcionar un email en el query parameter "to". Ejemplo: /email/test?to=tu-email@ejemplo.com',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new HttpException(
        'El email proporcionado no tiene un formato válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.resendService.sendTestEmail(to);
      return {
        success: true,
        message: `Correo de prueba enviado a ${to}`,
        note: 'Verifica tu bandeja de entrada (y spam) para confirmar que Resend está funcionando correctamente.',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al enviar correo de prueba',
          error: error.message,
          note: 'Verifica que RESEND_API_KEY esté configurada correctamente en .env',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

