import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase-admin';

// Inicializar cliente de MercadoPago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-8291475713481232-072111-5d07be8c8b2a3a0e633d4e0b0d3a95ab-123456789' });

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');
    const type = url.searchParams.get('type') || url.searchParams.get('topic');

    if (!id) {
      return NextResponse.json({ error: 'Falta ID' }, { status: 400 });
    }

    if (type === 'payment') {
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: id });

      if (paymentData && paymentData.status === 'approved' && paymentData.metadata?.user_id) {
        const userId = paymentData.metadata.user_id;

        // Calcular expiración: +30 días
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        // Actualizar usuario en Firestore
        await adminDb.collection('users').doc(userId).update({
          subscriptionStatus: 'active',
          subscriptionExpiryDate: expiryDate.toISOString(),
          mercadoPagoSubscriptionId: paymentData.id?.toString()
        });
        
        console.log(`[Webhook MP] Suscripción activada para el usuario ${userId}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error procesando webhook MP:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
