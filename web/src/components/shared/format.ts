// 时间显示格式化（仅UI显示，不属于合成数据路径）

/** 02:05 形式 */
export function fmtClock(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** T+01:23.4 形式（事件日志用） */
export function fmtT(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `T+${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}
