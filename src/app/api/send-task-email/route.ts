
import { NextResponse } from 'next/server';
import { sendEmail } from '@/services/email-service';
import type { Task, User } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task, user } = body as { task: Task, user: User };

    if (!task || !user || !user.email) {
      return NextResponse.json({ error: 'Faltan datos de la tarea o del usuario.' }, { status: 400 });
    }
    
    const notificationEmail = user.notificationEmail || user.email;

    const subject = `Nueva Tarea Asignada en AgroVision: ${task.title}`;
    const text = `Hola ${user.name},\n\nSe te ha asignado una nueva tarea en AgroVision:\n\n- Título: ${task.title}\n- Descripción: ${task.description}\n- Prioridad: ${task.priority}\n- Creada por: ${task.createdBy.name}\n\nPuedes ver más detalles en la aplicación.\n\nSaludos,\nEl equipo de AgroVision`;
    
    // Basic HTML version of the email
    const html = `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Nueva Tarea Asignada en AgroVision</h2>
        <p>Hola ${user.name},</p>
        <p>Se te ha asignado una nueva tarea en la plataforma AgroVision. A continuación se muestran los detalles:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; font-weight: bold; width: 120px;">Título:</td>
            <td style="padding: 8px;">${task.title}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; font-weight: bold;">Descripción:</td>
            <td style="padding: 8px;">${task.description}</td>
          </tr>
           <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; font-weight: bold;">Prioridad:</td>
            <td style="padding: 8px;">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; font-weight: bold;">Creada por:</td>
            <td style="padding: 8px;">${task.createdBy.name}</td>
          </tr>
        </table>
        <p>Por favor, revisa la sección de Tareas en la aplicación para ver más detalles y actualizar su estado.</p>
        <p>Saludos,<br>El equipo de AgroVision</p>
      </div>
    `;

    await sendEmail({ to: notificationEmail, subject, text, html });

    return NextResponse.json({ message: 'Correo enviado exitosamente.' });

  } catch (error) {
    console.error('Error al enviar correo de tarea:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor al intentar enviar el correo.' }, { status: 500 });
  }
}
