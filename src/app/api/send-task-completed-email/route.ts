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

    const subject = `Tarea Completada en AgroVista: ${task.title}`;
    const text = `Hola ${user.name},\n\nLa tarea que creaste ha sido marcada como completada en AgroVista:\n\n- Título: ${task.title}\n- Descripción: ${task.description}\n- Asignada a: ${task.assignedTo.name}\n\nPuedes verificar los detalles en el tablero de tareas.\n\nSaludos,\nEl equipo de AgroVista`;
    
    // Basic HTML version of the email
    const html = `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Tarea Completada en AgroVista</h2>
        <p>Hola ${user.name},</p>
        <p>Una tarea que tú registraste ha sido marcada como completada. A continuación se muestran los detalles:</p>
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
            <td style="padding: 8px; font-weight: bold;">Asignada a:</td>
            <td style="padding: 8px;">${task.assignedTo.name}</td>
          </tr>
        </table>
        <p>Por favor, revisa el tablero de Tareas si deseas verificarla.</p>
        <p>Saludos,<br>El equipo de AgroVista</p>
      </div>
    `;

    await sendEmail({ to: notificationEmail, subject, text, html });

    return NextResponse.json({ message: 'Correo enviado exitosamente.' });

  } catch (error) {
    console.error('Error al enviar correo de tarea completada:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor al intentar enviar el correo.' }, { status: 500 });
  }
}
