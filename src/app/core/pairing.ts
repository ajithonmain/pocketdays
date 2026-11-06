/**
 * Short pairing codes for linking a second device.
 *
 * The server never sees the code. A device that already owns a diary derives a lookup id and an
 * encryption key from the code, encrypts its private diary key with AES-GCM and uploads only the id
 * and the ciphertext. The new device derives the same values from the typed code, claims the
 * ciphertext once and decrypts it locally.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const SALT = 'pocketdays-pairing-v1';
const ITERATIONS = 200_000;
const KEY_PATTERN = /^[a-f0-9]{64}$/;

export const PAIR_CODE_TTL_SECONDS = 600;

export interface SealedPairing { id: string; payload: string; }

const bytesToHex = (bytes: Uint8Array): string => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const bytesToBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (text: string): Uint8Array => Uint8Array.from(atob(text), c => c.charCodeAt(0));

/** Generates a code such as K7M2-9QXA (40 bits). */
export function generatePairCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  const chars = Array.from(random, b => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/** Uppercases and strips separators; returns an empty string when the text cannot be a code. */
export function normalizePairCode(input: string): string {
  const clean = input.toUpperCase().replace(/[\s-]/g, '');
  return clean.length === CODE_LENGTH && [...clean].every(c => ALPHABET.includes(c)) ? clean : '';
}

async function derive(code: string): Promise<{ id: string; key: CryptoKey }> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(SALT), iterations: ITERATIONS }, material, 512));
  const key = await crypto.subtle.importKey('raw', bits.slice(32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { id: bytesToHex(bits.slice(0, 32)), key };
}

/** Lookup id only, used when claiming. */
export async function pairingId(code: string): Promise<string> {
  const normalized = normalizePairCode(code);
  if (!normalized) throw new Error('Enter the 8 character code.');
  return (await derive(normalized)).id;
}

export async function sealDiaryKey(code: string, diaryKey: string): Promise<SealedPairing> {
  const normalized = normalizePairCode(code);
  if (!normalized) throw new Error('Invalid code.');
  if (!KEY_PATTERN.test(diaryKey)) throw new Error('Invalid diary key.');
  const { id, key } = await derive(normalized);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(diaryKey)));
  const payload = new Uint8Array(iv.length + sealed.length);
  payload.set(iv); payload.set(sealed, iv.length);
  return { id, payload: bytesToBase64(payload) };
}

export async function openDiaryKey(code: string, payload: string): Promise<string> {
  const normalized = normalizePairCode(code);
  if (!normalized) throw new Error('Enter the 8 character code.');
  try {
    const bytes = base64ToBytes(payload);
    const { key } = await derive(normalized);
    const plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)));
    if (!KEY_PATTERN.test(plain)) throw new Error('bad');
    return plain;
  } catch {
    throw new Error('That code did not work.');
  }
}
