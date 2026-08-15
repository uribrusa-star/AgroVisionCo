import { NextResponse } from 'next/server';
import { sendEmail } from '@/services/email-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alerts, weatherSummary } = body as { 
      alerts?: Array<{ risk: string; eventDate: string; recommendation: string; urgency: string }>;
      weatherSummary?: string;
    };

    const recipient = 'uribrusa@gmail.com';

    if (!alerts || alerts.length === 0) {
      // Si no hay riesgo, podemos enviar un reporte de clima estable o retornar
      return NextResponse.json({ message: 'No hay alertas críticas que notificar por correo.' });
    }

    const firstAlert = alerts[0];
    const subject = `⚠️ ALERTA CLIMÁTICA AGROVISTA: ${firstAlert.risk} en Coronda`;

    const htmlAlerts = alerts.map(alt => `
      <div style="background-color: #fff; border-left: 5px solid ${alt.urgency === 'Alta' ? '#dc2626' : '#2563eb'}; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="color: ${alt.urgency === 'Alta' ? '#b91c1c' : '#1e40af'}; margin-top: 0; font-size: 16px;">
          ${alt.urgency === 'Alta' ? '🔴' : '🟦'} ${alt.risk}
        </h3>
        <p style="margin: 5px 0; font-size: 14px; color: #374151;">
          <strong>Día Crítico:</strong> <span style="background-color: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${alt.eventDate}</span>
        </p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563; line-height: 1.5;">
          ${alt.recommendation}
        </p>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          
          <!-- Encabezado con Banner -->
          <div style="background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">🍓 AgroVista IA - Inferencia Climática</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Detector Agronómico Semanal de Riesgo en Coronda (-31.97, -60.92)</p>
          </div>

          <!-- Contenido -->
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #374151; margin-top: 0;">
              Hola <strong>Admin (Uriel)</strong>,
            </p>
            <p style="font-size: 14px; color: #374151; line-height: 1.5;">
              La Inteligencia Artificial de AgroVista ha detectado condiciones meteorológicas que requieren atención inmediata en los lotes de la Cuenca Frutillera de Coronda:
            </p>

            ${htmlAlerts}

            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #065f46;">
              💡 <strong>Nota del Sistema:</strong> Esta alerta fue generada automáticamente con datos del modelo meteorológico de alta resolución en tiempo real. Puedes ingresar al panel de SuperAdmin para emitir una notificación push masiva a todos los productores.
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb;">
            AgroVisionCo - Sistema Inteligente de Gestión Agrícola<br>
            Notificación automática enviada a uribrusa@gmail.com
          </div>

        </div>
      </body>
      </html>
    `;

    const text = `AgroVista - Alerta Climática en Coronda\n\n` + alerts.map(a => `${a.risk} - ${a.eventDate}\n${a.recommendation}`).join('\n\n');

    await sendEmail({
      to: recipient,
      subject,
      text,
      html
    });

    return NextResponse.json({ message: `Alerta enviada exitosamente a ${recipient}` });
  } catch (error) {
    console.error('Error enviando email de alerta climática:', error);
    return NextResponse.json({ error: 'Fallo al enviar correo de alerta climática' }, { status: 500 });
  }
}
