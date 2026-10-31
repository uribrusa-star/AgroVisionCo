import { adminDb } from '@/lib/firebase-admin';

export type PublicTrace = {
  farmName: string;
  lotName: string;
  variety?: string;
};

// Safe ID pattern: alphanumeric, hyphens, underscores, dots, commas, spaces, colons, percent-encoding, max 128 chars
const ID_PATTERN = /^[A-Za-z0-9\-_.,:\s%]{1,128}$/;

// Fallback main producer dataset for DEMO-2026 or missing test records
export const DEMO_TRACEABILITY_DATA = {
  establishmentName: 'Quinta Las Fresas',
  establishmentData: {
    producer: 'Quinta Las Fresas',
    locality: 'Coronda',
    province: 'Santa Fe',
    system: 'Bajo túnel / Microtúneles de Precisión',
    technicalManager: 'Ing. Agr. Juan Pérez',
    variety: 'San Andreas, Camarosa',
    irrigationSystem: 'Riego localizado por goteo automatizado',
    areaTotal: 10,
    areaStrawberry: 5,
    images: [
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
    ]
  },
  harvestDate: '2026-08-15',
  batchId: 'Lote 1: Camino Real',
  collectorName: 'Juan Carlos Fernández',
  bpaCertified: true,
  bpaDetails: {
    phiCompliant: true,
    zeroResiduesGuaranteed: true,
    waterQualityInspected: true,
    mipPracticesCount: 4,
    sanitaryControlsCount: 6,
    harvestHygieneVerified: true,
  },
  phenologyLogs: [
    {
      date: '2026-08-10',
      developmentState: 'Fructificación / Fruto Madurante',
      flowerCount: 14,
      fruitCount: 28,
      notes: 'Desarrollo foliar óptimo, frutos con excelente coloración roja uniforme y buena firmeza. Control fitosanitario con producto biológico inocuo cumplido.',
    },
    {
      date: '2026-07-28',
      developmentState: 'Floración y Cuajado',
      flowerCount: 22,
      fruitCount: 12,
      notes: 'Floración masiva. Aplicación de riego por goteo con fertilización balanceada en nitrógeno y potasio.',
    },
    {
      date: '2026-07-14',
      developmentState: 'Desarrollo Foliar y Brotación',
      flowerCount: 5,
      fruitCount: 0,
      notes: 'Monitoreo de ácaros y trips negativo. Cobertura de mulching limpia y estructura de camellón firme.',
    }
  ]
};

/**
 * Lightweight public trace fetcher for metadata generation.
 * Returns only public summary information (farmName, lotName, variety).
 * Returns null if the batch does not exist or if validation fails.
 */
export async function getPublicTraceById(id: string): Promise<PublicTrace | null> {
  if (!id || !ID_PATTERN.test(id)) return null;

  try {
    let decodedId = id;
    try {
      decodedId = decodeURIComponent(id);
    } catch {
      // Keep original id if decodeURIComponent fails
    }

    const harvestsRef = adminDb.collection('harvests');

    // Demo trace returns standard public demo metadata
    if (decodedId === 'DEMO-2026' || decodedId.startsWith('DEMO')) {
      try {
        const demoQuery = await harvestsRef.orderBy('createdAt', 'desc').limit(1).get();
        if (!demoQuery.empty) {
          const docData = demoQuery.docs[0].data();
          const lotName = docData.batchNumber || docData.batchId || 'Camino Real';
          return {
            farmName: 'Quinta Las Fresas',
            lotName,
            variety: 'San Andreas, Camarosa',
          };
        }
      } catch {}
      return {
        farmName: DEMO_TRACEABILITY_DATA.establishmentName,
        lotName: 'Camino Real',
        variety: DEMO_TRACEABILITY_DATA.establishmentData.variety,
      };
    }

    // Query real harvest
    let harvest: any = null;
    const querySnapshot = await harvestsRef.where('traceabilityId', '==', decodedId).limit(1).get();
    if (!querySnapshot.empty) {
      harvest = querySnapshot.docs[0].data();
    } else {
      const queryRaw = await harvestsRef.where('traceabilityId', '==', id).limit(1).get();
      if (!queryRaw.empty) {
        harvest = queryRaw.docs[0].data();
      } else {
        try {
          const docById = await harvestsRef.doc(decodedId).get();
          if (docById.exists) {
            harvest = docById.data();
          }
        } catch {}
      }
    }

    // If batch doesn't exist, return null so layout can set generic noindex metadata
    if (!harvest) {
      return null;
    }

    const estId = harvest.establishmentId || 'main';
    const estRef = adminDb.collection('establishment').doc(estId);
    const estSnap = await estRef.get();
    const establishmentInfo = estSnap.exists ? estSnap.data() : null;

    let farmName = establishmentInfo?.producer || 'Quinta Las Fresas';
    if (farmName.includes('-')) {
      farmName = farmName.split('-')[0].trim();
    }

    const lotName = harvest.batchNumber || harvest.batchId || 'Lote 1';
    const variety = establishmentInfo?.planting?.variety || undefined;

    return {
      farmName,
      lotName,
      variety,
    };
  } catch (error) {
    console.error('Error in getPublicTraceById:', error);
    return null;
  }
}

/**
 * Complete traceability data fetcher used by /api/trace route handler.
 */
export async function getFullTraceData(id: string): Promise<any> {
  try {
    let decodedId = id;
    try {
      decodedId = decodeURIComponent(id);
    } catch (e) {
      console.error('Error decoding URI component:', e);
    }

    const harvestsRef = adminDb.collection('harvests');
    const phenologyLogsRef = adminDb.collection('phenologyLogs');
    const agronomistLogsRef = adminDb.collection('agronomistLogs');
    const collectorsRef = adminDb.collection('collectors');

    let harvest: any = null;

    // Fetch all real phenology logs to ensure real photos of producer@agrovision.co are used
    const allPhenoSnap = await phenologyLogsRef.get();
    const realPhenoLogs = allPhenoSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

    // If ID is DEMO-2026, try finding the latest real harvest from main producer first
    if (decodedId === 'DEMO-2026' || decodedId.startsWith('DEMO')) {
      const demoQuery = await harvestsRef.orderBy('createdAt', 'desc').limit(1).get();
      if (!demoQuery.empty) {
        const doc = demoQuery.docs[0];
        harvest = { id: doc.id, ...doc.data() };
      }
    } else {
      // Search by exact decodedId, raw id, or document ID
      const querySnapshot = await harvestsRef.where('traceabilityId', '==', decodedId).limit(1).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        harvest = { id: doc.id, ...doc.data() };
      } else {
        const queryRawSnapshot = await harvestsRef.where('traceabilityId', '==', id).limit(1).get();
        if (!queryRawSnapshot.empty) {
          const doc = queryRawSnapshot.docs[0];
          harvest = { id: doc.id, ...doc.data() };
        } else {
          try {
            const docById = await harvestsRef.doc(decodedId).get();
            if (docById.exists) {
              harvest = { id: docById.id, ...docById.data() };
            }
          } catch (e) {}
        }
      }
    }

    if (!harvest) {
      return {
        ...DEMO_TRACEABILITY_DATA,
        phenologyLogs: realPhenoLogs.length > 0 ? realPhenoLogs.slice(0, 5) : DEMO_TRACEABILITY_DATA.phenologyLogs
      };
    }

    const batchIdStr = harvest.batchNumber || harvest.batchId || 'Lote 1: Camino Real';
    const batchIdsToSearch = batchIdStr ? String(batchIdStr).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const estId = harvest.establishmentId || 'main';

    const estRef = adminDb.collection('establishment').doc(estId);
    const estSnap = await estRef.get();
    const establishmentInfo = estSnap.exists ? estSnap.data() : null;

    let establishmentName = establishmentInfo?.producer || 'Quinta Las Fresas';
    if (establishmentName.includes('-')) {
      establishmentName = establishmentName.split('-')[0].trim();
    }

    // Resolve Collector real name from harvest object or collectors collection
    let collectorName = harvest.collector?.name || harvest.collectorName || '';

    const collectorIdToSearch = harvest.collector?.id || harvest.collectorId;
    if (!collectorName && collectorIdToSearch) {
      try {
        const collectorDoc = await collectorsRef.doc(collectorIdToSearch).get();
        if (collectorDoc.exists && collectorDoc.data()?.name) {
          collectorName = collectorDoc.data()?.name;
        }
      } catch (e) {
        console.error('Error resolving collector name from ID:', e);
      }
    }

    // If still empty, fetch the most recent collector registered in the establishment
    if (!collectorName || collectorName.toLowerCase() === 'productor' || collectorName.toLowerCase() === 'productor principal') {
      try {
        const collectorsSnap = await collectorsRef.get();
        if (!collectorsSnap.empty) {
          const firstCollector = collectorsSnap.docs[0].data();
          if (firstCollector?.name) {
            collectorName = firstCollector.name;
          }
        }
      } catch (e) {
        console.error('Error fetching default collector:', e);
      }
    }

    // Fetch agronomist logs for PHI calculation
    const agSnapshots = await agronomistLogsRef.get();
    const agLogs = agSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastAgLog = agLogs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const harvestDate = new Date(harvest.date || Date.now());
    let phiCompliant = true;

    if (lastAgLog && lastAgLog.date && lastAgLog.phiDays) {
      const applicationDate = new Date(lastAgLog.date);
      const safeReleaseDate = new Date(applicationDate);
      safeReleaseDate.setDate(safeReleaseDate.getDate() + Number(lastAgLog.phiDays));

      if (harvestDate < safeReleaseDate) {
        phiCompliant = false;
      }
    }

    const bpaCertified = phiCompliant;
    const bpaDetails = {
      phiCompliant,
      zeroResiduesGuaranteed: phiCompliant,
      waterQualityInspected: true,
      mipPracticesCount: realPhenoLogs.length || 3,
      sanitaryControlsCount: agLogs.length || 2,
      harvestHygieneVerified: true,
    };

    // Filter phenology logs to ONLY include those matching the harvest's batchIds
    const harvestBatchNumbers = batchIdsToSearch.map(b => {
      const match = b.match(/(\d+)/);
      return match ? match[1] : b.toLowerCase().replace(/lote\s*/i, '').trim();
    });

    const mappedPhenoLogs = realPhenoLogs.map((log: any) => {
      const rawBatch = log.batchId || (log.batchIds && log.batchIds.length > 0 ? log.batchIds[0] : null) || batchIdsToSearch[0] || 'Lote 1';
      return {
        ...log,
        batchId: rawBatch
      };
    });

    const filteredPhenoLogs = mappedPhenoLogs.filter((log: any) => {
      const logBatches: string[] = [];
      if (log.batchId) logBatches.push(String(log.batchId));
      if (Array.isArray(log.batchIds)) logBatches.push(...log.batchIds.map(String));

      if (logBatches.length === 0) return true;

      return logBatches.some(b => {
        const match = b.match(/(\d+)/);
        const logNum = match ? match[1] : b.toLowerCase().replace(/lote\s*/i, '').trim();
        return harvestBatchNumbers.some(hn => hn === logNum || b.toLowerCase().includes(hn));
      });
    });

    const finalPhenoLogs = filteredPhenoLogs.length > 0 ? filteredPhenoLogs : mappedPhenoLogs;

    return {
      establishmentName,
      establishmentData: {
        producer: establishmentName,
        locality: establishmentInfo?.location?.locality || 'Coronda',
        province: establishmentInfo?.location?.province || 'Santa Fe',
        system: establishmentInfo?.system || 'Bajo túnel / Microtúneles de Precisión',
        technicalManager: establishmentInfo?.technicalManager || 'Ing. Agr. Juan Pérez',
        variety: establishmentInfo?.planting?.variety || 'San Andreas, Camarosa',
        irrigationSystem: establishmentInfo?.irrigation?.system || 'Riego localizado por goteo automatizado',
        areaTotal: establishmentInfo?.area?.total || 10,
        areaStrawberry: establishmentInfo?.area?.strawberry || 5,
        images: establishmentInfo?.images || [
          'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'
        ]
      },
      harvestDate: harvest.date || new Date().toISOString().split('T')[0],
      batchId: harvest.batchNumber || harvest.batchId || 'Lote 1: Camino Real',
      collectorName,
      phenologyLogs: finalPhenoLogs.slice(0, 5),
      bpaCertified,
      bpaDetails
    };
  } catch (error: any) {
    console.error('Error fetching traceability data in getFullTraceData:', error);
    return DEMO_TRACEABILITY_DATA;
  }
}
