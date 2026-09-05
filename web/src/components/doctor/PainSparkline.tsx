// 疼痛趋势迷你线（纯 SVG sparkline）
export default function PainSparkline({
  pains,
  width = 150,
  height = 48,
  color = "#38E1D4",
}: {
  pains: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const pad = 4;
  const max = Math.max(10, ...pains);
  const min = 0;
  const n = pains.length;
  const x = (i: number) => pad + (i / (n - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / (max - min)) * (height - pad * 2);
  const pts = pains.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPts = `${pad},${height - pad} ${pts} ${width - pad},${height - pad}`;
  const lastX = x(n - 1);
  const lastY = y(pains[n - 1]);

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polygon points={areaPts} fill={color} opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  );
}
