import { AgronomistLog, Batch, BatchPhiStatus } from './types';

/**
 * Evalúa si un lote específico se encuentra en período de carencia (PHI) activo.
 */
export function getBatchPhiStatus(
  batchId: string,
  agronomistLogs: AgronomistLog[],
  checkDate: Date = new Date()
): BatchPhiStatus {
  if (!agronomistLogs || agronomistLogs.length === 0 || !batchId) {
    return { isBlocked: false };
  }

  const checkTimestamp = checkDate.getTime();
  let activeBlock: BatchPhiStatus = { isBlocked: false };
  let maxUnlockTimestamp = 0;

  for (const log of agronomistLogs) {
    if (!log.phiDays || log.phiDays <= 0 || !log.batchIds || !log.batchIds.includes(batchId)) {
      continue;
    }

    const appDate = new Date(log.date);
    if (isNaN(appDate.getTime())) continue;

    // Calcular fecha de desbloqueo: fecha de aplicación + phiDays
    const unlockTimestamp = appDate.getTime() + log.phiDays * 24 * 60 * 60 * 1000;

    // Solo si el desbloqueo es en el futuro y posterior a la fecha consultada
    if (unlockTimestamp > checkTimestamp) {
      if (unlockTimestamp > maxUnlockTimestamp) {
        maxUnlockTimestamp = unlockTimestamp;
        const unlockDate = new Date(unlockTimestamp);
        const remainingMs = unlockTimestamp - checkTimestamp;
        const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        const productName = log.product || (log.supplies && log.supplies.length > 0
          ? log.supplies.map(s => s.name).join(', ')
          : 'Aplicación fitosanitaria');

        activeBlock = {
          isBlocked: true,
          phiDays: log.phiDays,
          applicationDate: appDate.toISOString(),
          unlockDate,
          productName,
          logId: log.id,
          remainingDays,
          remainingHours
        };
      }
    }
  }

  return activeBlock;
}

/**
 * Devuelve un mapa con el estado PHI de todos los lotes evaluados.
 */
export function getAllActivePhiBlocks(
  agronomistLogs: AgronomistLog[],
  batches: Batch[],
  checkDate: Date = new Date()
): Map<string, BatchPhiStatus> {
  const statusMap = new Map<string, BatchPhiStatus>();
  for (const batch of batches) {
    const status = getBatchPhiStatus(batch.id, agronomistLogs, checkDate);
    statusMap.set(batch.id, status);
  }
  return statusMap;
}
