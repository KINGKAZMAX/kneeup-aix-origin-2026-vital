// 本地规则引擎（AI未接入时的降级）：打卡 → 危机判定 / 今日训练建议
// 红线自查：全部为建议性用语；危机路径只输出「建议尽快就医」；不含禁用词

import { PATIENTS } from "@/lib/synth/patients";

export interface CheckIn {
  /** 疼痛自评 0-10 */
  pain: number;
  /** 肿胀 0-3 */
  swelling: number;
  /** 卡顿 0-3 */
  catching: number;
  /** 打软腿 0-3 */
  givingWay: number;
  /** 补充说明 */
  note: string;
}

export interface PlanItem {
  name: string;
  dosage: string;
  support: string;
}

export interface Plan {
  /** 今日状态一句话 */
  bandLabel: string;
  /** 今日建议屈膝幅度上限 ° */
  rom: number;
  items: PlanItem[];
  cautions: string[];
  encourage: string;
  /** 相对平日的强度 */
  intensityNote: string;
}

export interface CheckInResult {
  /** 是否触发危机转介（红灯信号） */
  crisis: boolean;
  /** 触发原因（展示用） */
  reasons: string[];
  plan: Plan;
  yesterdayPain: number;
}

const P1 = PATIENTS[0];
const COMMON_CAUTIONS = [
  "动作放慢，膝盖不超过脚尖",
  "呼气发力、吸气还原，节奏保持均匀",
  "如疼痛加重或肿胀明显增加，立即停止并休息",
];

/** 危机/低强度档方案 */
export function reducedPlan(): Plan {
  return {
    bandLabel: "今日以低强度活动为主，量减到平时的一半以下",
    rom: 40,
    items: [
      { name: "坐姿伸膝", dosage: "8次 × 1组", support: "支撑档位 1" },
      { name: "靠墙静蹲", dosage: "15秒 × 1组", support: "支撑档位 1" },
    ],
    cautions: [
      "幅度宁小勿大，全程保持在无痛范围",
      ...COMMON_CAUTIONS,
      "组间休息延长到 60 秒，感觉良好再继续",
    ],
    encourage: "愿意动一动就已经很好，明天再慢慢加回来。",
    intensityNote: "约为平时强度的 40%",
  };
}

function buildPlan(c: CheckIn, yesterdayPain: number): Plan {
  if (c.pain <= 2) {
    return {
      bandLabel: `状态不错（疼痛 ${c.pain}/10），可以按计划正常训练`,
      rom: 70,
      items: [
        { name: "坐姿伸膝", dosage: "12次 × 3组", support: "支撑档位 2" },
        { name: "靠墙静蹲", dosage: "30秒 × 3组", support: "支撑档位 2" },
      ],
      cautions: c.catching >= 1
        ? [...COMMON_CAUTIONS, "今天有卡顿感：如卡顿加重，停下当前那组休息"]
        : COMMON_CAUTIONS,
      encourage: "昨天你也全部完成了，保持这个节奏就很棒。",
      intensityNote: "计划强度的 100%",
    };
  }
  if (c.pain <= 4) {
    return {
      bandLabel: `轻度疼痛（${c.pain}/10），可以正常训练，强度略降`,
      rom: 60,
      items: [
        { name: "坐姿伸膝", dosage: "10次 × 3组", support: "支撑档位 2" },
        { name: "靠墙静蹲", dosage: "25秒 × 3组", support: "支撑档位 2" },
      ],
      cautions: [...COMMON_CAUTIONS, "与前一天对比：昨天疼痛 " + yesterdayPain + "/10，如有加重先减量"],
      encourage: "带着一点感觉训练没关系，稳住就是进步。",
      intensityNote: "约为计划强度的 80%",
    };
  }
  return {
    bandLabel: `疼痛较明显（${c.pain}/10），建议今天减量、放慢完成`,
    rom: 50,
    items: [
      { name: "坐姿伸膝", dosage: "8次 × 2组", support: "支撑档位 1" },
      { name: "靠墙静蹲", dosage: "20秒 × 2组", support: "支撑档位 1" },
    ],
    cautions: [
      "只做无痛范围，宁可少做一组",
      ...COMMON_CAUTIONS,
      "如果明天疼痛继续加重，建议休息并关注打卡信号",
    ],
    encourage: "今天肯练就是胜利，量力而行不丢人。",
    intensityNote: "约为计划强度的 60%",
  };
}

/**
 * 打卡评估（本地规则 · AI联线后升级为LLM）：
 * crisis = 疼痛≥6 或 红灯信号（较昨日疼痛骤增 / 肿胀明显 / 反复打软）
 */
export function evalCheckIn(c: CheckIn): CheckInResult {
  const yesterdayPain = P1.days[P1.days.length - 2].pain; // 合成档案：昨日=day6
  const reasons: string[] = [];
  if (c.pain >= 6) reasons.push(`疼痛自评 ${c.pain}/10，明显高于近期水平`);
  if (c.pain >= yesterdayPain + 3) reasons.push(`疼痛较昨日骤增 +${c.pain - yesterdayPain}`);
  if (c.swelling >= 2) reasons.push("肿胀明显（或伴发热感）");
  if (c.givingWay >= 2) reasons.push("反复出现打软腿");
  const crisis = reasons.length > 0;
  return {
    crisis,
    reasons,
    plan: crisis ? reducedPlan() : buildPlan(c, yesterdayPain),
    yesterdayPain,
  };
}
