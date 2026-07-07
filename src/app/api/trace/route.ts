
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

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

    const batchIdStr = harvest.batchNumber;
    const batchIdsToSearch = batchIdStr.split(',').map((s: string) => s.trim()).filter(Boolean);

    const phenologyLogsRef = collection(db, 'phenologyLogs');
    const logsPromises = batchIdsToSearch.flatMap((b: string) => [
      getDocs(query(phenologyLogsRef, where('batchIds', 'array-contains', b))),
      getDocs(query(phenologyLogsRef, where('batchId', '==', b)))
    ]);

    const snapshots = await Promise.all(logsPromises);

    const phenologyLogsMap = new Map();
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => phenologyLogsMap.set(doc.id, { id: doc.id, ...doc.data() }));
    });

    const phenologyLogs = Array.from(phenologyLogsMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

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
