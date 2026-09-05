// 合成数据引擎 · 种子策略（docs/25 §5）
// 数据路径禁用 Math.random()/Date.now()，同一种子逐点可复现

export const DEMO_SEED = "AIR-FLOW-Knee-AIxOrigin-2026-HK";

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller 高斯噪声（均值0方差1） */
export function makeGauss(rand: () => number): () => number {
  return () => {
    const u = Math.max(rand(), 1e-9);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export function makeNoise(seedStr: string) {
  const rand = mulberry32(hashString(seedStr));
  const gauss = makeGauss(rand);
  /** 均值0方差1的高斯；clampN: 限幅到±n */
  const g = (n?: number) => {
    const v = gauss();
    return n === undefined ? v : Math.max(-n, Math.min(n, v));
  };
  /** 均值0方差1均匀噪声 in [-1,1] */
  const n1 = () => rand() * 2 - 1;
  return { rand, g, n1 };
}
