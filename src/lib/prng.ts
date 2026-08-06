// A tiny deterministic PRNG (mulberry32). Used instead of Math.random() when
// generating one-off geometry (particle positions, etc.) inside render/useMemo,
// so the calculation stays a pure function of its inputs — which keeps it
// compatible with the React Compiler's purity checks, unlike Math.random().
export function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
