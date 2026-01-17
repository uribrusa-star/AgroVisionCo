
import nodemailer from 'nodemailer';

interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

// Asegúrate de que las variables de entorno estén definidas.
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
    console.warn(
        'Las credenciales de correo no están configuradas en el archivo .env. Las notificaciones por email no funcionarán.'
    );
}

// Configuración para usar el servidor SMTP de Gmail.
// Esto es diferente de usar la API de Gmail, que es más compleja y requiere OAuth2.
// Para este método, solo se necesita una "Contraseña de aplicación" generada desde la cuenta de Google.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass, // Usar una contraseña de aplicación de Gmail
    },
});

export const sendEmail = async (mailOptions: MailOptions) => {
    // Si las credenciales no están configuradas, no intentes enviar el correo.
    if (!emailUser || !emailPass || emailUser.includes('tu-correo')) {
        console.error("Intento de envío de correo fallido: las credenciales EMAIL_USER y EMAIL_PASS no están configuradas.");
        return; // No arrojes un error, solo registra y no envíes.
    }

    try {
        await transporter.sendMail({
            from: `"AgroVision" <${emailUser}>`,
            ...mailOptions,
        });
    } catch (error) {
        console.error('Error al enviar correo electrónico:', error);
        // No relanzar el error para no bloquear el flujo principal de la aplicación
    }
};
