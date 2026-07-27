import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';

// Inicializar cliente de MercadoPago (Modo Sandbox/Prueba por defecto)
// En producción, esto debería venir de process.env.MP_ACCESS_TOKEN
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-8291475713481232-072111-5d07be8c8b2a3a0e633d4e0b0d3a95ab-123456789' });

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (!session.user || session.user.role !== 'Productor') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [
          {
            id: 'sub_agrovision',
            title: 'Suscripción Mensual AgroVista',
            description: 'Acceso completo a las herramientas de gestión agrícola',
            quantity: 1,
            unit_price: 100000, // $100.000 ARS
            currency_id: 'ARS',
          }
        ],
        payer: {
          email: session.user.email,
          name: session.user.name,
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/profile?payment=success`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/profile?payment=failure`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/profile?payment=pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://agrovista.com.ar'}/api/webhooks/mercadopago`,
        external_reference: session.user.id, // Muy importante para vincular el pago con el usuario
        metadata: {
          userId: session.user.id
        }
      }
    });

    return NextResponse.json({ init_point: response.init_point, sandbox_init_point: response.sandbox_init_point });
  } catch (error) {
    console.error('Error creando preferencia MP:', error);
    return NextResponse.json({ error: 'Error al generar el link de pago' }, { status: 500 });
  }
}
