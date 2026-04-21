// Deterministic provably-fair RNG primitives (HMAC-SHA256 stream).
// Cursor-based so a single (serverSeed, clientSeed, nonce) can produce many
// floats — needed for multi-step games (mines, plinko, tower, blackjack…).

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateServerSeed(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** One float in [0,1) per cursor, derived from HMAC-SHA256 of `${clientSeed}:${nonce}:${cursor}`. */
async function hmacFloat(serverSeed: string, clientSeed: string, nonce: number, cursor: number): Promise<number> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serverSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${clientSeed}:${nonce}:${cursor}`),
  );
  const bytes = new Uint8Array(sig);
  // Use first 4 bytes — uniform [0,1)
  let n = 0;
  for (let i = 0; i < 4; i++) n = n * 256 + bytes[i];
  return n / 2 ** 32;
}

/** Stream interface — call .next() to get successive floats. */
export class FloatStream {
  private cursor = 0;
  constructor(
    public readonly serverSeed: string,
    public readonly clientSeed: string,
    public readonly nonce: number,
  ) {}
  async next(): Promise<number> {
    return hmacFloat(this.serverSeed, this.clientSeed, this.nonce, this.cursor++);
  }
  async nextInt(maxExclusive: number): Promise<number> {
    return Math.floor((await this.next()) * maxExclusive);
  }
  /** Fisher-Yates shuffle (used for mines positions, keno draws, decks…). */
  async shuffle<T>(items: T[]): Promise<T[]> {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = await this.nextInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
