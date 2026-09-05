// /body3d 部位数据表：护具传感链路可触达的身体问题部位（合成演示数据，非诊断）
export type PartId = "knee" | "hip" | "ankle" | "waist";

export interface BodyPart {
  id: PartId;
  name: string;
  nameEn: string;
  problems: string[];
  metrics: string[];
  blurb: string;
}

export const PARTS: BodyPart[] = [
  {
    id: "knee",
    name: "膝关节",
    nameEn: "KNEE",
    problems: ["半月板磨损", "髌骨软化", "膝OA"],
    metrics: ["屈伸角度", "左右负重比"],
    blurb: "护具直接包裹部位：sEMG + 关节腔压 + 角度传感在此采信，是整条数据链路的原点。",
  },
  {
    id: "hip",
    name: "髋部",
    nameEn: "HIP",
    problems: ["髋部代偿", "步态外旋"],
    metrics: ["步态对称性"],
    blurb: "膝痛常见的上游代偿部位，由左右腿运动时序差异间接推断，非直接测量。",
  },
  {
    id: "ankle",
    name: "踝部",
    nameEn: "ANKLE",
    problems: ["踝背屈不足"],
    metrics: ["支撑相时长"],
    blurb: "支撑相时长异常提示踝背屈储备不足，由步态节律间接推断，非直接测量。",
  },
  {
    id: "waist",
    name: "腰部",
    nameEn: "WAIST",
    problems: ["躯干前倾代偿"],
    metrics: ["躯干倾角"],
    blurb: "躯干前倾是膝 OA 常见代偿姿态，由躯干倾角趋势间接推断，非直接测量。",
  },
];

export const PART_MAP: Record<PartId, BodyPart> = Object.fromEntries(
  PARTS.map((p) => [p.id, p])
) as Record<PartId, BodyPart>;
