<div align="center">

# AIR-FLOW Knee+

**让膝康复走出医院、回到家里的 AI 训练伙伴** · Soft Healthcare 软件闭环

[![赛道](https://img.shields.io/badge/赛道-Vital_活域_·_Soft_Healthcare-9_AF6262?style=flat-square)](https://aixorigin.innoai.org.cn)
[![赛事](https://img.shields.io/badge/AIx_Origin_Summit-2026_香港_数码港-38E1D4?style=flat-square)](https://aixorigin.innoai.org.cn)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/许可证-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md)

</div>

---

> **"我不想只做病人——我想更聪明地再去爬山。"**
> —— 志远，62 岁，退休建筑师，左膝半月板术后*（合成人物档案）*

**问题**：全球膝骨关节炎人群 3.65 亿（WHO）；在香港，公立医院膝关节置换轮候中位最长 **72 个月**（立法会 2022），约 **50%** 的居家锻炼计划半途而废（Argent 2018）。康复的瓶颈不在院内，而在家里每一个无人监督的日子。

**AIR-FLOW Knee+** 用三端 Web 闭环 + AI 数据层补上这块缺口：患者每日打卡、跟着实时安全反馈训练；医生看 **AI 生成的周报摘要**（不必翻原始数据）并调整训练计划；设备模拟器实时推流合成 sEMG / 关节腔压 / 屈膝角度信号，并复现赛前硬件原型（**MENISCUS SHIELD**：Arduino + 气囊自适应护膝）的安全状态机。**去掉 AI 层，闭环即不成立**——个性化建议、代偿趋势识别、风险分级、医生摘要全部由 AI 驱动。

## 🖥 在线演示

| 端 | 评委现场走什么 |
|---|---|
| **患者端** `/patient` | 每日症状打卡 → AI 训练建议 → 实时训练模式（三路实时图表 + 三态安全灯）→ AI 训练报告 |
| **医生端** `/doctor` | 患者列表 → **AI 周报摘要**（不逐条看数据）→ 调整训练计划 → 下发 |
| **设备模拟器** `/simulator` | 虚拟 AIR-FLOW 护膝：脚本/手动双模式，10Hz 合成信号推流，触发 SAFE→RISK→OVER 状态机 |
| **AI 数据大屏** `/dashboard` | 1080p 一屏：风险分级牌、趋势图、摘要轮播、`AI LAYER ACTIVE` |

**90 秒闭环**：医生看摘要 → 下发计划 → 患者打卡 → 训练（模拟器推流；约 62 秒黄灯*代偿提示*、约 84 秒红灯*压力超限→自动泄气*）→ AI 报告 → 医生收到新摘要。一镜到底。

<p align="center">
<img src="assets/knee_patient.png" width="48%" alt="患者端"> <img src="assets/knee_simulator.png" width="48%" alt="设备模拟器">
</p>
<p align="center">
<img src="assets/knee_doctor.png" width="48%" alt="医生端"> <img src="assets/knee_dashboard.png" width="48%" alt="AI大屏">
</p>

<p align="center"><img src="assets/arch.png" width="92%" alt="三端架构"></p>

## ✨ 核心特性

- 🌡 **打卡即转介**——疼痛 ≥6 或红灯信号触发「建议尽快就医」提示（不提供医疗建议）
- 🛡 **安全状态机**（SAFE/RISK/OVER，带滞回防抖）复现硬件行为：*停止加压 → 立即泄气 → 建议暂停*
- 📈 **确定性合成信号**——种子化 PRNG（数据路径零 `Math.random()`），10Hz sEMG 包络/MDF 代理/关节腔压/屈膝角度，每次演示逐点可复现
- 🤖 **AI 透明度**——每个 AI 输出都有标注，见[透明度表格](#-ai-透明度)
- 🏥 **医生端 AI 摘要**——7 天趋势、代偿模式、A/B/C 风险分级、计划调整建议（仅供参考，非医疗建议）
- ⚖️ **合规文案内建**——全站禁用词审查零命中（诊断/治疗/处方/治愈），每页常驻免责声明

## 🤖 AI 透明度

按 Vital 赛道规则，如实披露哪些由模型生成、哪些是规则/模板：

| 能力 | 当前实现 | 路线图 |
|---|---|---|
| 安全状态机（风险分、超限触发） | **确定性规则**（物理启发信号模型，可审计） | 保持规则——安全逻辑不允许幻觉 |
| 训练建议/训练报告/周报摘要 | **本地规则引擎 + 模板**（`src/lib/ai.ts`，`AI_MODE=local-fallback`） | LLM 升级接口已备（`POST /api/ai`，2 秒超时自动降级模板）——离线安全是设计目标 |
| 代偿趋势识别 | 信号模型指标（幅度衰减 + MDF 下移） | 端侧 ML |

演示构建不提交任何密钥、不调用外部 API（**无跨境数据传输**——全部在浏览器内运行）。

## 🚀 快速开始

```bash
cd web
npm install
npm run dev        # http://localhost:3000
# 生产静态导出（web/out 已包含）
npm run build && npx serve out
```

## 📁 仓库结构

```
├── web/                  # Next.js 14 应用（App Router / TS / Tailwind / Recharts）
│   ├── src/app/          # /patient /doctor /simulator /dashboard 四端
│   ├── src/lib/synth/    # 确定性合成信号引擎 + 安全状态机
│   └── out/              # 静态导出（可托管任意静态主机）
├── docs/                 # 情报、讲稿、合规包（中文）
│   ├── 00-情报库v2.md     # 唯一事实源
│   ├── 15-合规文案包.md   # 免责声明与禁用词包
│   └── 30-提交说明与诚信自查.md
└── assets/               # 赛前硬件研究（MENISCUS SHIELD）+ 演示截图
```

## 🦿 硬件背景（赛前研究）

软件闭环延伸自工业设计研究 **MENISCUS SHIELD**——自适应膝关节护具概念（硅胶气囊 + sEMG + 关节腔压感知；屈膝充气支撑、伸直放气复位；超压自动泄气），已有 Arduino 可运行原型（见下图，完整研究在 `assets/pdf/`）。本次参赛主体是 **Soft Healthcare 软件闭环**，硬件为下一步路线图。

<p align="center">
<img src="assets/pdf/page-4.png" width="46%" alt="Arduino 原型实拍"> <img src="assets/pdf/page-5.png" width="46%" alt="爆炸图与穿戴实拍">
</p>

## ⚖️ 伦理与合规声明

- 本产品为**康复训练辅助软件，非医疗器械**，不诊断、不治疗、不开处方、不替代专业诊疗。
- 每页常驻显著免责声明（中英）；危机信号转介「尽快就医」。
- **全部数据为合成数据**——3 个虚构患者档案、种子化生成器、零真实患者数据（页脚已注明）。
- 最少收集原则：演示状态仅存于浏览器。
- 诚信说明：赛前研究 = 硬件概念与设计研究（已注明）；`web/` 全部为比赛期间开发（见 git 历史）。

## 🏆 团队

**自由意志 · Free Will** — AIx Origin Summit 2026 · Vital 活域赛道 · 香港（数码港）

队长：万博阳（工业设计，[waffledesign.site](https://waffledesign.site)）· 完整名单见提交表。

## 📄 许可证

[MIT](LICENSE) — 比赛期间构建 © 2026 自由意志队。赛前设计研究（MENISCUS SHIELD 素材）© 万博阳。
