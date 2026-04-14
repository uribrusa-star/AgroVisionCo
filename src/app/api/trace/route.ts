
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Falta el ID de trazabilidad.' }, { status: 400 });
  }

  try {
    const harvestsRef = collection(db, 'harvests');
    const q = query(harvestsRef, where('traceabilityId', '==', id), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'ID de trazabilidad no encontrado.' }, { status: 404 });
    }

    const harvestDoc = querySnapshot.docs[0];
    const harvest = { id: harvestDoc.id, ...harvestDoc.data() };

    const batchId = harvest.batchNumber;

    // Fetch last 5 phenology logs for this batch
    const phenologyLogsRef = collection(db, 'phenologyLogs');
    const logsQuery = query(
      phenologyLogsRef,
      where('batchId', '==', batchId),
      limit(5)
    );
    const logsSnapshot = await getDocs(logsQuery);
    const phenologyLogs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // For this prototype, we'll return a subset of data.
    // In a real app, you might want to fetch establishment data too.
    const traceabilityData = {
      harvestDate: harvest.date,
      batchId: harvest.batchNumber,
      collectorName: harvest.collector.name,
      phenologyLogs: phenologyLogs.map(log => ({
          date: log.date,
          developmentState: log.developmentState,
          flowerCount: log.flowerCount,
          fruitCount: log.fruitCount,
          notes: log.notes,
          images: log.images
      })),
    };

    return NextResponse.json(traceabilityData);

  } catch (error) {
    console.error('Traceability fetch error:', error);
    return NextResponse.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
