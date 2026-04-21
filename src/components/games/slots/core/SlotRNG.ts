/**
 * SlotRNG — wraps the project's provably-fair RNG (generateOutcomeBytes) so
 * Phaser scenes never use Math.random(). Each scene instantiates one and
 * calls .next() / .pick() during reel generation.
 */
import { generateOutcomeBytes, generateServerSeed } from '@/lib/game/rng';

export class SlotRNG {
  private bytes: number[] = [];
  private index = 0;
  private serverSeed: string;
  private clientSeed: string;
  private nonce: number;

  constructor(seedHint?: string) {
    this.serverSeed = generateServerSeed();
    this.clientSeed = (seedHint ?? generateServerSeed()).slice(0, 16);
    this.nonce = Date.now() & 0x7fffffff;
    this.refresh(128);
  }

  /** Generate a fresh batch of outcome floats for one spin/cascade. */
  refresh(count: number) {
    this.nonce++;
    this.bytes = generateOutcomeBytes(this.serverSeed, this.clientSeed, this.nonce, count);
    this.index = 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    if (this.index >= this.bytes.length) this.refresh(128);
    return this.bytes[this.index++];
  }

  /** Integer in [0, max). */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Weighted pick from items with `.weight`. */
  pick<T extends { weight: number }>(items: T[]): T {
    const total = items.reduce((s, x) => s + x.weight, 0);
    let r = this.next() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1];
  }

  /** A bound function compatible with the existing pick* helpers that take rng:() => number. */
  fn = (): number => this.next();
}
