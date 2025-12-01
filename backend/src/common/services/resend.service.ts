import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { sanitizeErrorMessage, sanitizeStackTrace, sanitizeLogObject, sanitizeUrl } from '../utils/log-sanitizer.util';

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
  async sendRecoveryEmail(email: string, token: string): Promise<void> {
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
    } else if (emailFrom.includes('cemydi.com')) {
      // Si EMAIL_FROM contiene un dominio no verificado (como cemydi.com), 
      // usar automáticamente onboarding@resend.dev (siempre, no solo en producción)
      this.logger.warn(`⚠️ Dominio cemydi.com detectado en EMAIL_FROM. Usando dominio seguro onboarding@resend.dev`);
      emailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
    }
    
    // Obtener URL del frontend desde variables de entorno
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const subject = 'Recuperación de contraseña - Ortopedia CEMYDI';

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
          .link-container {
            background-color: #f9fafb;
            border: 2px dashed #29A2A1;
            border-radius: 8px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
          }
          .button {
            display: inline-block;
            background-color: #29A2A1;
            color: white;
            padding: 15px 35px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            margin: 10px 0;
          }
          .button:hover {
            background-color: #20626C;
          }
          .link-text {
            font-size: 14px;
            color: #6B7280;
            word-break: break-all;
            margin-top: 15px;
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
            <p>Has solicitado restablecer tu contraseña en <strong>Ortopedia CEMYDI</strong>. Haz clic en el siguiente botón para continuar:</p>
            
            <div class="link-container">
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              <p class="link-text">O copia y pega este enlace en tu navegador:<br>${resetUrl}</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Este enlace expira en <strong>10 minutos</strong></li>
                <li>No compartas este enlace con nadie</li>
                <li>Si no solicitaste este cambio, ignora este correo de forma segura</li>
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

      const response = await this.resend.emails.send({
        from: emailFrom,
        to: email,
        subject,
        html,
      });

      this.logger.log(`✅ Correo de recuperación enviado a ${email}`);
      this.logger.log(`   MessageId: ${response.data?.id || 'N/A'}`);
      
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`🔑 Token de recuperación: ${token}`);
        this.logger.debug(`💡 URL de recuperación: ${resetUrl}`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar correo de recuperación a ${email}`);
      this.logger.error(`   Error: ${sanitizeErrorMessage(error)}`);
      
      // Solo mostrar detalles adicionales en desarrollo
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`   Tipo: ${error.constructor?.name || 'Unknown'}`);
        
        // Sanitizar respuesta HTTP si existe
        if (error.response) {
          const sanitizedResponse = sanitizeLogObject(error.response);
          this.logger.debug(`   Respuesta HTTP: ${JSON.stringify(sanitizedResponse)}`);
        }
        
        // Sanitizar datos del error si existen
        if (error.data) {
          const sanitizedData = sanitizeLogObject(error.data);
          this.logger.debug(`   Datos del error: ${JSON.stringify(sanitizedData)}`);
        }
        
        // Stack trace solo en desarrollo
        const stack = sanitizeStackTrace(error);
        if (stack) {
          this.logger.debug(`   Stack: ${stack}`);
        }
      }
      
      // Si el error es por dominio no verificado, intentar automáticamente con onboarding@resend.dev
      const isDomainError = 
        error.message?.includes('domain') || 
        error.message?.includes('not verified') || 
        error.message?.includes('Invalid from address') ||
        error.message?.includes('cemydi.com') ||
        error.name === 'validation_error' ||
        (error.data && (error.data.name === 'validation_error' || error.data.message?.includes('domain') || error.data.message?.includes('not verified')));
      
      if (isDomainError) {
        this.logger.warn(`⚠️ Error de dominio detectado (${error.name || error.data?.name || 'unknown'}). Reintentando con onboarding@resend.dev`);
        
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
          
          if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(`🔑 Token de recuperación: ${token}`);
            this.logger.debug(`💡 URL de recuperación: ${resetUrl}`);
          }
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
   * Envía un correo de verificación de email con un link de verificación
   */
  async sendVerificationEmail(email: string, name: string, verificationToken: string): Promise<void> {
    if (!this.resend) {
      const error = new Error(
        'RESEND_API_KEY no está configurada. No se puede enviar el correo de verificación.',
      );
      this.logger.error(error.message);
      throw error;
    }

    // Obtener URL del frontend desde variables de entorno
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Usar onboarding@resend.dev por defecto si no hay EMAIL_FROM configurado
    let emailFrom = process.env.EMAIL_FROM;
    if (!emailFrom) {
      emailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
      this.logger.warn(`⚠️ EMAIL_FROM no configurado, usando: ${emailFrom}`);
    } else if (emailFrom.includes('cemydi.com')) {
      // Si el dominio no está verificado, usar el seguro (siempre, no solo en producción)
      emailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
      this.logger.warn(`⚠️ Dominio cemydi.com detectado. Usando dominio seguro onboarding@resend.dev para correo de verificación`);
    }

    const subject = 'Verifica tu correo electrónico - Ortopedia CEMYDI';

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
          .link-container {
            background-color: #f9fafb;
            border: 2px dashed #29A2A1;
            border-radius: 8px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
          }
          .button {
            display: inline-block;
            background-color: #29A2A1;
            color: white;
            padding: 14px 35px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            margin: 10px 0;
          }
          .button:hover {
            background-color: #20626C;
          }
          .link-text {
            word-break: break-all;
            color: #29A2A1;
            font-size: 12px;
            margin-top: 15px;
            padding: 10px;
            background-color: #ffffff;
            border-radius: 4px;
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
            <h1>Verificación de Correo Electrónico</h1>
          </div>
          <div class="content">
            <p>Hola ${name},</p>
            <p>Gracias por registrarte en <strong>Ortopedia CEMYDI</strong>. Para completar tu registro y poder iniciar sesión, verifica tu correo electrónico haciendo clic en el siguiente botón:</p>
            
            <div class="link-container">
              <a href="${verificationUrl}" class="button">Verificar Correo Electrónico</a>
              <p class="link-text">O copia y pega este enlace en tu navegador:<br>${verificationUrl}</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Este enlace expira en <strong>24 horas</strong></li>
                <li>Si no verificas tu correo, <strong>no podrás iniciar sesión</strong></li>
                <li>Si no creaste esta cuenta, puedes ignorar este correo de forma segura</li>
              </ul>
            </div>
            
            <p>Si tienes problemas con el botón, copia y pega el enlace de arriba en tu navegador.</p>
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
      const response = await this.resend.emails.send({
        from: emailFrom,
        to: email,
        subject,
        html,
      });

      // Log detallado de la respuesta
      const messageId = response.data?.id || 'N/A';
      const hasError = response.error !== null;
      
      if (!hasError) {
        this.logger.log(`✅ Correo de verificación enviado a ${email}`);
        this.logger.log(`   MessageId: ${messageId}`);
        this.logger.log(`   From: ${emailFrom}`);
        this.logger.log(`   To: ${email}`);
      } else {
        this.logger.error(`❌ Error al enviar correo: ${response.error}`);
      }
      
      // En desarrollo, mostrar respuesta completa para debugging (sanitizada)
      if (process.env.NODE_ENV !== 'production') {
        const sanitizedResponse = sanitizeLogObject(response);
        this.logger.debug(`   Respuesta completa de Resend:`, JSON.stringify(sanitizedResponse, null, 2));
        this.logger.debug(`🔑 Token de verificación: ${verificationToken}`);
        this.logger.debug(`💡 URL de verificación: ${sanitizeUrl(verificationUrl)}`);
        this.logger.log(`📧 Si no recibes el correo:`);
        this.logger.log(`   1. Revisa tu carpeta de SPAM/correo no deseado`);
        this.logger.log(`   2. Espera unos minutos (puede haber delay)`);
        this.logger.log(`   3. Usa el token de arriba para verificar manualmente en: ${verificationUrl}`);
        this.logger.log(`   4. O usa la página /verify-email para reenviar el correo`);
        
        // Si no hay MessageId pero tampoco hay error, el correo probablemente se envió
        if (messageId === 'N/A' && !hasError) {
          this.logger.warn(`⚠️ No se recibió MessageId, pero tampoco hay error.`);
          this.logger.warn(`   El correo probablemente se envió correctamente.`);
          this.logger.warn(`   Revisa tu carpeta de spam si no lo recibes.`);
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ Error al enviar correo de verificación a ${email}`);
      this.logger.error(`   Error: ${sanitizeErrorMessage(error)}`);
      
      // Solo mostrar detalles completos en desarrollo
      if (process.env.NODE_ENV !== 'production') {
        const sanitizedError = sanitizeLogObject(error);
        this.logger.debug(`   Error completo:`, JSON.stringify(sanitizedError, null, 2));
      }
      
      // Si el error es por dominio no verificado, intentar automáticamente con onboarding@resend.dev
      const isDomainError = 
        error.message?.includes('domain') || 
        error.message?.includes('not verified') || 
        error.message?.includes('Invalid from address') ||
        error.message?.includes('cemydi.com') ||
        error.name === 'validation_error' ||
        (error.data && (error.data.name === 'validation_error' || error.data.message?.includes('domain') || error.data.message?.includes('not verified')));
      
      if (isDomainError) {
        this.logger.warn(`⚠️ Error de dominio detectado (${error.name || error.data?.name || 'unknown'}). Reintentando con onboarding@resend.dev`);
        
        try {
          const safeEmailFrom = 'Ortopedia CEMYDI <onboarding@resend.dev>';
          this.logger.log(`📧 Reintentando envío desde: ${safeEmailFrom}`);
          
          const retryResponse = await this.resend.emails.send({
            from: safeEmailFrom,
            to: email,
            subject,
            html,
          });
          
          this.logger.log(`✅ Correo de verificación enviado a ${email} (usando dominio seguro)`);
          this.logger.log(`   MessageId: ${retryResponse.data?.id || 'N/A'}`);
          
          // En desarrollo, mostrar el token
          if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(`🔑 Token de verificación: ${verificationToken}`);
            this.logger.debug(`💡 URL de verificación: ${sanitizeUrl(verificationUrl)}`);
          }
          return; // Éxito, salir sin lanzar error
        } catch (retryError: any) {
          this.logger.error(`❌ Error también al reintentar: ${sanitizeErrorMessage(retryError)}`);
          
          // Solo mostrar detalles completos en desarrollo
          if (process.env.NODE_ENV !== 'production') {
            const sanitizedRetryError = sanitizeLogObject(retryError);
            this.logger.debug(`   Error completo del reintento:`, JSON.stringify(sanitizedRetryError, null, 2));
          }
          // Continuar con el error original
        }
      }
      
      // En desarrollo, mostrar información útil
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`⚠️ No se pudo enviar el correo, pero puedes usar el token manualmente:`);
        this.logger.warn(`🔑 Token: ${verificationToken}`);
        this.logger.warn(`💡 URL: ${sanitizeUrl(verificationUrl)}`);
        this.logger.warn(`📧 O usa el endpoint /auth/resend-verification para reenviar`);
      }
      
      // Proporcionar mensaje más específico
      let errorMessage = 'No se pudo enviar el correo de verificación';
      if (error.message?.includes('Invalid API key') || error.message?.includes('401')) {
        errorMessage = 'API Key de Resend inválida. Verifica RESEND_API_KEY en las variables de entorno.';
      } else if (error.message?.includes('domain') || error.message?.includes('from') || error.message?.includes('not verified')) {
        errorMessage = `Dominio de EMAIL_FROM no verificado. Configura EMAIL_FROM="Ortopedia CEMYDI <onboarding@resend.dev>" en las variables de entorno.`;
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
