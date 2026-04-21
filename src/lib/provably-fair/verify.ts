// Client-side provably fair verification
// Uses SubtleCrypto Web API — works in browser

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSHA256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface VerificationResult {
  valid: boolean;
  outcome: number;
  serverSeedValid: boolean;
}

export async function verifyRound(params: {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}): Promise<VerificationResult> {
  const computedHash = await sha256(params.serverSeed);
  const serverSeedValid = computedHash === params.serverSeedHash;
  if (!serverSeedValid) {
    return { valid: false, outcome: 0, serverSeedValid: false };
  }

  const hmac = await hmacSHA256(params.serverSeed, `${params.clientSeed}:${params.nonce}`);
  const bytes = hmac.slice(0, 8);
  const uint32 = parseInt(bytes, 16);
  const outcome = uint32 / 0x100000000;

  return { valid: true, outcome, serverSeedValid: true };
}

export async function verifyCrashRound(params: {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}): Promise<{ valid: boolean; crashPoint: number }> {
  const computedHash = await sha256(params.serverSeed);
  if (computedHash !== params.serverSeedHash) {
    return { valid: false, crashPoint: 0 };
  }

  const hmac = await hmacSHA256(params.serverSeed, `${params.clientSeed}:${params.nonce}`);
  const h = BigInt('0x' + hmac.slice(0, 16));
  const MAX = BigInt('0xFFFFFFFFFFFFFFFF');

  if (h % 101n === 0n) return { valid: true, crashPoint: 1.00 };

  const result = (100n * (MAX + 1n)) / (MAX + 1n - h);
  const crashPoint = Math.max(1.00, Number(result) / 100);

  return { valid: true, crashPoint };
}

export async function verifyDiceRound(params: {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}): Promise<{ valid: boolean; roll: number }> {
  const result = await verifyRound(params);
  if (!result.valid) return { valid: false, roll: 0 };
  return { valid: true, roll: Math.floor(result.outcome * 10000) / 100 };
}
