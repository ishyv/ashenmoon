/**
 * Seeded 2D Perlin Noise and Fractional Brownian Motion (FBM) generator.
 * Written as a pure TypeScript helper with zero dependencies to align with
 * core codebase values of clear, clean, and direct paths.
 */

export class SeededNoise {
  private permutation: number[];

  constructor(seed: number) {
    this.permutation = this.generatePermutation(seed);
  }

  /** Generates a deterministic permutation table based on the given seed. */
  private generatePermutation(seed: number): number[] {
    const arr = Array.from({ length: 256 }, (_, i) => i);
    // Seeded shuffle using a Linear Congruential Generator (LCG)
    let rand = seed;
    const nextRand = () => {
      rand = (rand * 1664525 + 1013904223) % 4294967296;
      return rand / 4294967296;
    };
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return [...arr, ...arr];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  /**
   * Generates a single octave of 2D Perlin Noise.
   * Returns a value normalized between 0.0 and 1.0.
   */
  public noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.permutation[this.permutation[X]! + Y]!;
    const ab = this.permutation[this.permutation[X]! + Y + 1]!;
    const ba = this.permutation[this.permutation[X + 1]! + Y]!;
    const bb = this.permutation[this.permutation[X + 1]! + Y + 1]!;

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    return (this.lerp(v, x1, x2) + 1.0) / 2.0;
  }

  /**
   * Accumulates multiple octaves of Perlin Noise to build natural terrain patterns.
   * Returns a value normalized between 0.0 and 1.0.
   */
  public fbm(x: number, y: number, octaves = 3): number {
    let value = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value / maxValue;
  }
}
