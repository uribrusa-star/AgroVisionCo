// Helper for dynamic QR codes and attendance payload validation

export interface DynamicQRPayload {
  agroVistaUser?: boolean;
  agroVistaWorker?: boolean;
  type?: 'collector' | 'packer' | 'user';
  id: string;
  name: string;
  role?: string;
  email?: string;
  dni?: string;
  ts?: number; // Minute epoch block
  token?: string;
}

/**
 * Generates a minute-based hash token for anti-screenshot protection
 */
export function generateSecurityToken(id: string, timeBlock: number): string {
  const secret = 'agrovista_secure_gate_salt';
  let hash = 0;
  const str = `${id}:${timeBlock}:${secret}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Builds the dynamic QR payload for a user.
 * Updates every minute block to prevent static screenshot sharing.
 */
export function buildDynamicUserQRPayload(user: { id: string; name: string; role: string; email?: string; dni?: string }): string {
  const timeBlock = Math.floor(Date.now() / 60000); // 60s window
  const token = generateSecurityToken(user.id, timeBlock);

  const payload: DynamicQRPayload = {
    agroVistaUser: true,
    type: 'user',
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    dni: user.dni || '',
    ts: timeBlock,
    token
  };

  return JSON.stringify(payload);
}

/**
 * Validates a scanned QR payload for attendance.
 * Returns decoded data or error message if fraud/expiration detected.
 */
export function parseAndValidateAttendanceQR(rawJson: string): {
  valid: boolean;
  data?: DynamicQRPayload;
  isDynamic?: boolean;
  error?: string;
} {
  try {
    const parsed: DynamicQRPayload = JSON.parse(rawJson);

    // Check if it's an AgroVista recognized QR
    if (!parsed.agroVistaUser && !parsed.agroVistaWorker && !parsed.id) {
      return { valid: false, error: 'Código QR no reconocido como credencial oficial de AgroVista.' };
    }

    // If it has a dynamic timestamp token
    if (parsed.ts && parsed.token) {
      const currentBlock = Math.floor(Date.now() / 60000);
      const diff = Math.abs(currentBlock - parsed.ts);
      
      // Allow +/- 2 minutes tolerance for network/clock differences
      if (diff > 2) {
        return {
          valid: false,
          error: 'Código QR expirado (captura antigua). El empleado debe mostrar la credencial actualizada desde la app.',
          isDynamic: true
        };
      }

      // Check token integrity
      const expectedToken = generateSecurityToken(parsed.id, parsed.ts);
      if (parsed.token !== expectedToken) {
        return {
          valid: false,
          error: 'Código QR inválido o adulterado.',
          isDynamic: true
        };
      }

      return { valid: true, data: parsed, isDynamic: true };
    }

    // Static credential (e.g. printed plastic badge)
    return { valid: true, data: parsed, isDynamic: false };
  } catch {
    return { valid: false, error: 'Formato de código QR inválido.' };
  }
}
