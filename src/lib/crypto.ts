/** パスワードハッシュ・検証 (PBKDF2) */

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const ALGORITHM = 'PBKDF2';
const HASH_ALGO = 'SHA-256';

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: ALGORITHM },
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: ALGORITHM,
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  const hashArray = new Uint8Array(hash);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = new Uint8Array(
      atob(storedHash)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    const salt = combined.slice(0, 16);
    const hash = combined.slice(16);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: ALGORITHM },
      false,
      ['deriveBits']
    );
    const derivedHash = await crypto.subtle.deriveBits(
      {
        name: ALGORITHM,
        salt,
        iterations: ITERATIONS,
        hash: HASH_ALGO,
      },
      keyMaterial,
      KEY_LENGTH * 8
    );
    const derivedArray = new Uint8Array(derivedHash);
    return hash.length === derivedArray.length && hash.every((v, i) => v === derivedArray[i]);
  } catch {
    return false;
  }
}

export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${timestamp}${random}`;
}

export function generateLectureCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7) code += '-';
  }
  return code;
}