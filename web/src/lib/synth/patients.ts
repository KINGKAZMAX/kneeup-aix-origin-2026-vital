// 3个虚拟患者档案（docs/25 §3）：7天打卡精确序列，演示确定性

export interface CheckInDay {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  pain: number;
  swelling: number;
  catching: number;
  givingWay: number;
  completionPct: number;
  note: string;
  redFlag?: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  scenario: string;
  quote?: string;
  days: CheckInDay[];
  digest: string;
}

export const PATIENTS: Patient[] = [
  {
    id: "p1-zhiyuan",
    name: "Zhiyuan",
    age: 62,
    scenario: "左膝半月板术后康复 · 高依从",
    quote: "我不想只做病人——我想更聪明地再去爬山",
    days: [
      { day: 1, pain: 5, swelling: 1, catching: 2, givingWay: 0, completionPct: 80, note: "上下楼有点费劲" },
      { day: 2, pain: 5, swelling: 1, catching: 1, givingWay: 0, completionPct: 85, note: "按计划完成两组" },
      { day: 3, pain: 4, swelling: 1, catching: 1, givingWay: 0, completionPct: 90, note: "早上下肢有轻快感" },
      { day: 4, pain: 4, swelling: 0, catching: 1, givingWay: 0, completionPct: 90, note: "今天走完了20分钟" },
      { day: 5, pain: 3, swelling: 0, catching: 0, givingWay: 0, completionPct: 95, note: "幅度加到70°没有不适" },
      { day: 6, pain: 3, swelling: 0, catching: 0, givingWay: 0, completionPct: 100, note: "全部完成" },
      { day: 7, pain: 3, swelling: 0, catching: 0, givingWay: 0, completionPct: 100, note: "膝盖感觉稳了" },
    ],
    digest:
      "7天训练完成率91%，疼痛自评5→3；屈膝训练幅度65°→78°；疲劳出现时间从22s延后到45s；无异常打卡信号。建议：维持当前计划，可尝试增加1组耐力练习（供参考，非医疗建议）。",
  },
  {
    id: "p2-guohao",
    name: "Guohao",
    age: 45,
    scenario: "右膝运动后疼痛 · 代偿模式被AI识别",
    days: [
      { day: 1, pain: 4, swelling: 0, catching: 1, givingWay: 0, completionPct: 100, note: "状态不错" },
      { day: 2, pain: 3, swelling: 1, catching: 1, givingWay: 0, completionPct: 75, note: "加班没做完" },
      { day: 3, pain: 4, swelling: 1, catching: 2, givingWay: 1, completionPct: 80, note: "右膝有点发紧" },
      { day: 4, pain: 5, swelling: 1, catching: 2, givingWay: 1, completionPct: 60, note: "跑完步后不舒服" },
      { day: 5, pain: 4, swelling: 0, catching: 1, givingWay: 0, completionPct: 85, note: "减量后好转" },
      { day: 6, pain: 3, swelling: 0, catching: 1, givingWay: 0, completionPct: 90, note: "按调整后幅度完成" },
      { day: 7, pain: 3, swelling: 0, catching: 0, givingWay: 0, completionPct: 95, note: "感觉可控" },
    ],
    digest:
      "完成率84%但d3–d4打卡疼痛回升+2；连续2次训练在60–75s出现代偿趋势（幅度下降、疲劳代理指标偏高）；AI已自动下调建议幅度至55°。建议：维持减量3天后再评估。",
  },
  {
    id: "p3-shufen",
    name: "Shufen",
    age: 68,
    scenario: "膝关节慢性劳损 · 危机转介演示",
    days: [
      { day: 1, pain: 3, swelling: 0, catching: 1, givingWay: 1, completionPct: 60, note: "做了部分" },
      { day: 2, pain: 3, swelling: 1, catching: 2, givingWay: 1, completionPct: 50, note: "今天累" },
      { day: 3, pain: 6, swelling: 2, catching: 2, givingWay: 2, completionPct: 0, note: "膝盖肿了没练", redFlag: true },
      { day: 4, pain: 7, swelling: 3, catching: 2, givingWay: 2, completionPct: 0, note: "发热，疼得明显", redFlag: true },
      { day: 5, pain: 4, swelling: 1, catching: 1, givingWay: 1, completionPct: 40, note: "好一些了" },
      { day: 6, pain: 3, swelling: 0, catching: 1, givingWay: 0, completionPct: 60, note: "恢复低强度" },
      { day: 7, pain: 3, swelling: 0, catching: 0, givingWay: 0, completionPct: 70, note: "完成全部组数" },
    ],
    digest:
      "d4打卡出现红灯信号（疼痛7+肿胀发热），系统已提示「建议尽快就医」；d6起恢复低强度训练。建议：维持保守幅度40°，关注打卡信号。",
  },
];
