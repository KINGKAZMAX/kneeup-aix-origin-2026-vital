// 安全状态机（docs/25 §4）：SAFE / RISK / OVER + 滞回防抖
// 复现硬件行为：超限 → 停止加压、立即泄气、提示暂停

export type SafetyState = "SAFE" | "RISK" | "OVER";

export const THRESH = {
  RISK_ENTER: 0.4,
  RISK_ENTER_SECS: 2.0,
  RISK_EXIT: 0.3,
  RISK_EXIT_SECS: 3.0,
  P_OVER: 22,
  P_OVER_SECS: 1.5,
  RISK_OVER: 0.85,
  RISK_OVER_SECS: 2.0,
  RESUME_P: 8,
  RESUME_SECS: 3.0,
} as const;

export interface SafetyRuntime {
  state: SafetyState;
  /** 连续计时器：进入当前候选状态已持续秒数 */
  riskAbove: number;
  riskBelow: number;
  pOver: number;
  riskMax: number;
  pUnderResume: number;
}

export function initSafety(): SafetyRuntime {
  return { state: "SAFE", riskAbove: 0, riskBelow: 0, pOver: 0, riskMax: 0, pUnderResume: 0 };
}

export interface SafetyInput {
  pressure: number;
  riskScore: number;
  paused: boolean;
}

/**
 * @returns 新状态；OVER触发时调用方执行泄气（blowoffAt=t）并置paused
 */
export function stepSafety(st: SafetyRuntime, input: SafetyInput, dt: number): SafetyState {
  if (input.paused) {
    // 暂停挂起：等压力回落且用户点继续（调用方负责resume按钮）
    st.pUnderResume = input.pressure <= THRESH.RESUME_P ? st.pUnderResume + dt : 0;
    return st.state;
  }
  const { pressure, riskScore } = input;

  st.pOver = pressure >= THRESH.P_OVER ? st.pOver + dt : 0;
  st.riskMax = riskScore >= THRESH.RISK_OVER ? st.riskMax + dt : 0;

  const overTriggered = st.pOver >= THRESH.P_OVER_SECS || st.riskMax >= THRESH.RISK_OVER_SECS;
  if (overTriggered) {
    st.state = "OVER";
    st.pOver = 0;
    st.riskMax = 0;
    return "OVER";
  }

  if (st.state === "SAFE") {
    st.riskAbove = riskScore >= THRESH.RISK_ENTER ? st.riskAbove + dt : 0;
    if (st.riskAbove >= THRESH.RISK_ENTER_SECS) {
      st.state = "RISK";
      st.riskAbove = 0;
    }
  } else if (st.state === "RISK") {
    st.riskBelow = riskScore <= THRESH.RISK_EXIT ? st.riskBelow + dt : 0;
    if (st.riskBelow >= THRESH.RISK_EXIT_SECS) {
      st.state = "SAFE";
      st.riskBelow = 0;
    }
  }
  return st.state;
}

export const STATE_UI: Record<SafetyState, { color: string; label: string; msg: string }> = {
  SAFE: {
    color: "#22c55e",
    label: "SAFE",
    msg: "运行正常 · 支撑与压力在安全范围内",
  },
  RISK: {
    color: "#eab308",
    label: "RISK",
    msg: "检测到代偿趋势：建议放慢节奏、减小屈膝幅度",
  },
  OVER: {
    color: "#ef4444",
    label: "OVER",
    msg: "压力超限：已停止加压，正在立即泄气。建议暂停训练，稍作休息",
  },
};
