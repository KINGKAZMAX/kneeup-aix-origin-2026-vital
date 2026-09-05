// AI 调用封装（docs/26 AI层prompt包 · 本次为本地降级版）
// 架构：generateReport() 先尝试 POST /api/ai（预留接口，未来后端接 LLM），
// 2s 超时或任何失败 → 本地模板 fallback（直接拼接 stats 字符串），保证演示永不空窗。

export const AI_MODE = "local-fallback" as const;

export const AI_ENDPOINT = "/api/ai";
export const AI_TIMEOUT_MS = 2000;

export const DISCLAIMER =
  "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗";

export type RiskLevel = "A" | "B" | "C";

export interface ReportStats {
  /** 7天训练完成率均值 % */
  completionAvgPct: number;
  painFirst: number;
  painLast: number;
  painMin: number;
  painMax: number;
  /** 红灯信号天数 */
  redFlagDays: number;
  /** 建议幅度（°） */
  romTargetDeg: number;
}

export interface ReportInput {
  patientId: string;
  patientName: string;
  riskLevel: RiskLevel;
  stats: ReportStats;
  locale?: "zh-CN" | "en-US";
}

export interface ReportOutput {
  text: string;
  mode: "remote" | typeof AI_MODE;
  generatedAt: string;
  disclaimer: string;
}

const RISK_LABEL: Record<RiskLevel, string> = {
  A: "稳定",
  B: "观察",
  C: "关注",
};

/**
 * 生成训练报告（医生端摘要场景）。
 * 1) 预留 POST /api/ai：未来 /api/ai 后端接 LLM（DeepSeek / gpt-4o-mini），前端零改动。
 * 2) 2s 超时（AbortController）；网络失败 / 非 200 / 响应缺 text → 一律降级。
 * 3) 本地模板：直接拼接 stats 数字字符串，输出确定、可离线、合规（无医疗结论）。
 */
export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`AI endpoint responded ${res.status}`);
    const data = (await res.json()) as Partial<ReportOutput> | null;
    if (!data || typeof data.text !== "string" || data.text.trim().length === 0) {
      throw new Error("AI endpoint returned empty text");
    }
    return {
      text: data.text,
      mode: "remote",
      generatedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };
  } catch {
    return localTemplateReport(input);
  }
}

/** 本地模板 fallback：直接拼接 stats 字符串（确定输出，演示保底） */
function localTemplateReport(input: ReportInput): ReportOutput {
  const s = input.stats;
  const riskText = RISK_LABEL[input.riskLevel];
  const closing =
    s.redFlagDays > 0
      ? `本周红灯信号 ${s.redFlagDays} 天，系统已提示「建议尽快就医」；建议维持保守幅度 ${s.romTargetDeg}°，关注每日打卡信号。`
      : `本周无红灯信号；建议维持当前训练计划，幅度目标 ${s.romTargetDeg}°。`;
  const text =
    `${input.patientName} 近7天训练完成率均值 ${s.completionAvgPct}%；` +
    `疼痛自评 ${s.painFirst}→${s.painLast}（本周区间 ${s.painMin}–${s.painMax}）。` +
    `风险分级 ${input.riskLevel}（${riskText}）。` +
    `${closing}（供参考，非医疗建议）`;
  return {
    text,
    mode: AI_MODE,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}
