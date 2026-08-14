import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Correo electrónico no válido'),
  phone: z.string().optional(),
  role: z.string().min(1, 'Selecciona un rol'),
  location: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
      } : undefined,
    });

    const destinationEmail = 'contactoagrovisionco@gmail.com';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #16a34a;">
          <h2 style="color: #15803d; margin: 0;">🌱 Nueva Solicitud de Contacto - AgroVista</h2>
          <p style="color: #666666; font-size: 14px; margin-top: 4px;">Recibida desde la página web principal</p>
        </div>

        <div style="margin-top: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Nombre:</td>
              <td style="padding: 8px 0; color: #555;">${validatedData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Email:</td>
              <td style="padding: 8px 0; color: #555;"><a href="mailto:${validatedData.email}" style="color: #16a34a;">${validatedData.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Teléfono:</td>
              <td style="padding: 8px 0; color: #555;">${validatedData.phone || 'No especificado'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Perfil / Rol:</td>
              <td style="padding: 8px 0; color: #555; font-weight: bold; color: #15803d;">${validatedData.role}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Ubicación:</td>
              <td style="padding: 8px 0; color: #555;">${validatedData.location || 'No especificada'}</td>
            </tr>
          </table>

          ${validatedData.message ? `
            <div style="margin-top: 16px; padding: 12px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              <h4 style="margin: 0 0 6px 0; color: #166534;">Mensaje / Consulta:</h4>
              <p style="margin: 0; color: #374151; white-space: pre-wrap;">${validatedData.message}</p>
            </div>
          ` : ''}
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eeeeee; text-align: center; font-size: 12px; color: #888888;">
          AgroVista — Desarrollado en Coronda, Santa Fe, Argentina.
        </div>
      </div>
    `;

    if (smtpUser && smtpPass) {
      await transporter.sendMail({
        from: `"AgroVista Web" <${smtpUser}>`,
        to: destinationEmail,
        replyTo: validatedData.email,
        subject: `[Contacto AgroVista] ${validatedData.name} - ${validatedData.role}`,
        html: htmlContent,
      });
    } else {
      console.log('--- NUEVA SOLICITUD DE CONTACTO (MODO MOCK DE CORREO) ---');
      console.log('Para:', destinationEmail);
      console.log('Datos:', validatedData);
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada con éxito',
    });
  } catch (error: any) {
    console.error('Error enviando formulario de contacto:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: 'Ocurrió un error al procesar el envío' },
      { status: 500 }
    );
  }
}
