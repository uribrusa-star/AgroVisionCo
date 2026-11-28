import crypto from 'crypto';

/**
 * Genera un hash seguro para la contraseña utilizando scrypt con sal aleatoria.
 * Formato devuelto: scrypt:<salt>:<derivedKeyHex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifica si la contraseña provista coincide con el hash almacenado (o contraseña legacy).
 * Es resistente a ataques de temporización (timing attacks).
 */
export function verifyPassword(password: string, storedHashOrPlain?: string | null): boolean {
  if (!password || !storedHashOrPlain) return false;

  // Si ya está hasheada con scrypt
  if (storedHashOrPlain.startsWith('scrypt:')) {
    const parts = storedHashOrPlain.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHashHex] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expectedHashHex, 'hex');
    
    if (derivedKey.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, expectedBuffer);
  }

  // Compatibilidad hacia atrás para contraseñas legacy en texto plano
  // Se usa timingSafeEqual para evitar ataques de canal lateral
  const passBuf = Buffer.from(password);
  const storedBuf = Buffer.from(storedHashOrPlain);
  if (passBuf.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(passBuf, storedBuf);
}
