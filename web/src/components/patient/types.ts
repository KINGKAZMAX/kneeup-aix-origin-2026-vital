// 患者端共享类型

import type { SynthFrame } from "@/lib/synth/signals";

/** 训练会话统计（TrainingView 结束时传给 ReportView） */
export interface SessionSummary {
  sessionId: string;
  endedBy: "auto" | "manual";
  /** 会话时长（合成会话秒） */
  durationSec: number;
  /** 超限（OVER）触发次数 */
  overCount: number;
  /** 峰值腔压 kPa */
  peakPressure: number;
  /** 峰值屈膝角度 ° */
  peakAngle: number;
  /** 平均 sEMG 包络 μV */
  avgEmg: number;
  /** 每次 OVER 触发时刻（会话秒） */
  overTimes: number[];
  /** 全量帧（报告图用） */
  frames: SynthFrame[];
}
