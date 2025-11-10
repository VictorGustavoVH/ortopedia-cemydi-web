import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      this.logger.warn(
        '⚠️ RESEND_API_KEY no está configurada en .env. Los correos no se enviarán.',
      );
      this.logger.warn(
        '⚠️ Configura RESEND_API_KEY en .env. Obtén tu clave en https://resend.com',
      );
    } else {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ ResendService inicializado correctamente');
    }
  }

  /**
   * Envía un correo con el código OTP de recuperación de contraseña
   */
  async sendRecoveryEmail(email: string, otp: string): Promise<void> {
    if (!this.resend) {
      const error = new Error(
        'RESEND_API_KEY no está configurada. Configura la variable de entorno.',
      );
      this.logger.error('❌ Error al enviar correo:', error.message);
      throw error;
    }

    // Determinar el email remitente
    let emailFrom = process.env.EMAIL_FROM;
    
    // Si no hay EMAIL_FROM configurado, usar dominio seguro
    if (!emailFrom) {
      emailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
      this.logger.warn(`⚠️ EMAIL_FROM no configurado, usando: ${emailFrom}`);
    } else {
      // Si EMAIL_FROM contiene un dominio no verificado (como cemydi.com), 
      // usar automáticamente onboarding@resend.dev en producción
      if (process.env.NODE_ENV === 'production' && emailFrom.includes('cemydi.com')) {
        this.logger.warn(`⚠️ Dominio cemydi.com detectado en EMAIL_FROM. Usando dominio seguro onboarding@resend.dev`);
        emailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
      }
    }
    
    const subject = 'Código de recuperación de contraseña';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            background-color: #29A2A1;
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px 20px;
            background-color: #ffffff;
          }
          .code-container {
            background-color: #f9fafb;
            border: 2px dashed #29A2A1;
            border-radius: 8px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #29A2A1;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning strong {
            color: #92400E;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6B7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Has solicitado restablecer tu contraseña en <strong>Ortopedia CEMYDI</strong>. Usa el siguiente código para continuar:</p>
            
            <div class="code-container">
              <div class="code">${otp}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Este código expira en <strong>10 minutos</strong></li>
                <li>No compartas este código con nadie</li>
                <li>Si no solicitaste este código, ignora este correo</li>
              </ul>
            </div>
            
            <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>&copy; ${new Date().getFullYear()} Ortopedia CEMYDI. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      this.logger.log(`📧 Preparando envío de correo a: ${email}`);
      this.logger.log(`📧 Desde: ${emailFrom}`);
      this.logger.log(`📧 Código OTP: ${otp}`);

      const response = await this.resend.emails.send({
        from: emailFrom,
        to: email,
        subject,
        html,
      });

      this.logger.log(`✅ Correo de recuperación enviado a ${email}`);
      this.logger.log(`   MessageId: ${response.data?.id || 'N/A'}`);
      this.logger.log(`   Código OTP: ${otp}`);
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar correo a ${email}:`);
      this.logger.error(`   Error: ${error.message}`);
      this.logger.error(`   Tipo: ${error.constructor.name}`);
      
      // Log detallado del error de Resend
      if (error.response) {
        this.logger.error(`   Respuesta HTTP: ${JSON.stringify(error.response)}`);
      }
      if (error.data) {
        this.logger.error(`   Datos del error: ${JSON.stringify(error.data)}`);
      }
      if (error.stack) {
        this.logger.error(`   Stack: ${error.stack}`);
      }
      
      // Si el error es por dominio no verificado, intentar automáticamente con onboarding@resend.dev
      if (error.message?.includes('domain') || error.message?.includes('not verified') || 
          error.message?.includes('Invalid from address') || error.data?.message?.includes('domain')) {
        this.logger.warn(`⚠️ Error de dominio detectado. Reintentando con onboarding@resend.dev`);
        
        try {
          const safeEmailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
          this.logger.log(`📧 Reintentando envío desde: ${safeEmailFrom}`);
          
          const retryResponse = await this.resend.emails.send({
            from: safeEmailFrom,
            to: email,
            subject,
            html,
          });
          
          this.logger.log(`✅ Correo de recuperación enviado a ${email} (usando dominio seguro)`);
          this.logger.log(`   MessageId: ${retryResponse.data?.id || 'N/A'}`);
          this.logger.log(`   Código OTP: ${otp}`);
          return; // Éxito, salir sin lanzar error
        } catch (retryError: any) {
          this.logger.error(`❌ Error también al reintentar: ${retryError.message}`);
          // Continuar con el error original
        }
      }
      
      // Proporcionar mensaje más específico
      let errorMessage = 'No se pudo enviar el correo de recuperación';
      if (error.message?.includes('Invalid API key') || error.message?.includes('401')) {
        errorMessage = 'API Key de Resend inválida. Verifica RESEND_API_KEY en las variables de entorno.';
      } else if (error.message?.includes('domain') || error.message?.includes('from') || error.message?.includes('not verified')) {
        errorMessage = `Dominio de EMAIL_FROM no verificado. Configura EMAIL_FROM="Ortopedia CEMYDI <onboarding@resend.dev>" en Vercel.`;
      } else if (error.message) {
        errorMessage = `Error de Resend: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Envía un correo de prueba (solo para desarrollo)
   */
  async sendTestEmail(to: string): Promise<void> {
    if (!this.resend) {
      throw new Error('RESEND_API_KEY no está configurada');
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Este endpoint solo está disponible en desarrollo');
    }

    // Usar onboarding@resend.dev por defecto para pruebas
    let emailFrom = process.env.EMAIL_FROM;
    if (!emailFrom) {
      emailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
    } else if (emailFrom.includes('cemydi.com')) {
      // Si el dominio no está verificado, usar el seguro
      emailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
      this.logger.warn(`⚠️ Usando dominio seguro para correo de prueba`);
    }
    const subject = 'Correo de prueba - Ortopedia CEMYDI';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            background-color: #29A2A1;
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            padding: 30px 20px;
          }
          .success {
            background-color: #D1FAE5;
            border-left: 4px solid #10B981;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Correo de Prueba</h1>
          </div>
          <div class="content">
            <p>Este es un correo de prueba del sistema de Ortopedia CEMYDI.</p>
            <div class="success">
              <strong>✅ Resend está funcionando correctamente</strong>
            </div>
            <p>Si recibes este correo, significa que la integración con Resend está configurada correctamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await this.resend.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
      });

      this.logger.log(`✅ Correo de prueba enviado a ${to}`);
      this.logger.log(`   MessageId: ${response.data?.id || 'N/A'}`);
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar correo de prueba a ${to}:`);
      this.logger.error(`   Error: ${error.message}`);
      throw error;
    }
  }
}
