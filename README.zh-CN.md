<div align="center">

# Kneeup 膝望

**让膝康复走出医院、回到家里的 AI 训练伙伴** · Soft Healthcare 软件闭环

[![赛道](https://img.shields.io/badge/赛道-Vital_活域_·_Soft_Healthcare-9_AF6262?style=flat-square)](https://aixorigin.innoai.org.cn)
[![赛事](https://img.shields.io/badge/AIx_Origin_Summit-2026_香港_数码港-38E1D4?style=flat-square)](https://aixorigin.innoai.org.cn)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/许可证-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md)

**[🌐 在线 Demo（GitHub Pages）](https://kingkazmax.github.io/kneeup-aix-origin-2026-vital/)** · **[🎬 三分钟视频](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-3min-submission-video.mp4)** · **[📄 Checkpoint 进展说明](docs/31-Checkpoint进展说明.md)**

</div>

---

> **"我不想只做病人——我想更聪明地再去爬山。"**
> —— 志远，62 岁，退休建筑师，左膝半月板术后*（合成人物档案）*

**问题**：全球膝骨关节炎人群 3.65 亿（WHO）；在香港，公立医院膝关节置换轮候中位最长 **72 个月**（立法会 2022），约 **50%** 的居家锻炼计划半途而废（Argent 2018）。康复的瓶颈不在院内，而在家里每一个无人监督的日子。

**Kneeup 膝望**用多端 Web 闭环 + AI 数据层补上这块缺口：患者每日打卡、跟着实时安全反馈训练；医生看 **AI 生成的周报摘要**（不必翻原始数据）并调整训练计划；设备模拟器实时推流合成 sEMG / 关节腔压 / 屈膝角度信号，并复现赛前硬件原型（**MENISCUS SHIELD**：Arduino + 气囊自适应护膝）的安全状态机。**去掉 AI 层，闭环即不成立**——个性化建议、代偿趋势识别、风险分级、医生摘要全部由 AI 驱动。

## 🎯 决赛路演 Deck——13 页完整故事，一目了然

最终版路演排版全览：封面 → 问题切入 → 服务人群 → 用户旅程 → 产品定义 → 研究证据 → 硬件系统 → 闭环控制 → 工作流程 → AI 在哪里。

<p align="center">
<img src="assets/deck/page-01.png" width="92%" alt="Deck 01 — 封面：KneeUp 膝望 · AI 驱动气动康复护膝系统">
</p>
<p align="center">
<img src="assets/deck/page-02.png" width="92%" alt="Deck 02 — 切入：衰老，从「走路越来越累」开始">
</p>
<p align="center">
<img src="assets/deck/page-03.png" width="92%" alt="Deck 03 — 细节信号：扶手上楼、坡道减速、长走疲劳">
</p>
<p align="center">
<img src="assets/deck/page-04.png" width="92%" alt="Deck 04 — 服务谁：60–75 银发人群、下肢肌力下降、术后康复">
</p>
<p align="center">
<img src="assets/deck/page-05.png" width="92%" alt="Deck 05 — 用户旅程图：一次徒步的分阶段痛点">
</p>
<p align="center">
<img src="assets/deck/page-06.png" width="92%" alt="Deck 06 — KneeUp 是什么：传感 + 气囊助力的穿戴式设备">
</p>
<p align="center">
<img src="assets/deck/page-07.png" width="92%" alt="Deck 07 — 研究：半月板损伤成因分布">
</p>
<p align="center">
<img src="assets/deck/page-08.png" width="92%" alt="Deck 08 — 研究：损伤管理与治疗路径 + 半月板解剖">
</p>
<p align="center">
<img src="assets/deck/page-09.png" width="92%" alt="Deck 09 — 研究：人群差异（45 岁以上退变性损伤超 60%）">
</p>
<p align="center">
<img src="assets/deck/page-10.png" width="92%" alt="Deck 10 — 硬件系统：sEMG 感知、微控制器、智能调节、反馈监测">
</p>
<p align="center">
<img src="assets/deck/page-11.png" width="92%" alt="Deck 11 — 闭环控制逻辑 + 固件代码">
</p>
<p align="center">
<img src="assets/deck/page-12.png" width="92%" alt="Deck 12 — 工作流程：感知动作 → 理解状态 → 判断助力 → 气囊充气">
</p>
<p align="center">
<img src="assets/deck/page-13.png" width="92%" alt="Deck 13 — AI 在哪里：按动作/角度/疲劳综合判断 10–55% 助力档位">
</p>

## 🎬 视频矩阵（内嵌预览，自动播放，无需点开）

**展示视频 · 三分钟路演正片**（中文旁白 + 内嵌字幕，180 秒三连播）——痛点 → 产品闭环 → 软件实录（同一会话实际界面）→ 试点计划；每镜头带画面内来源标签，按 Vital 透明度要求披露

<p align="center">
<img src="https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/main-p1.gif" width="31.5%" alt="路演正片 1/3 · 0–60s"> <img src="https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/main-p2.gif" width="31.5%" alt="路演正片 2/3 · 60–120s"> <img src="https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/main-p3.gif" width="31.5%" alt="路演正片 3/3 · 120–180s">
</p>

**Demo 视频 · MENISCUS SHIELD 原型讲解**（赛前既有工作，已声明；15 秒预览）

<p align="center"><img src="https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/prototype.gif" width="66%" alt="原型讲解预览"></p>

**实验视频 · 台架实录**——左：sEMG 肌电电极 + 控制器 + 泵（27 秒节选）；右：硅胶气囊样件探索（12 秒节选；材料/结构证据，不作功效主张）

<p align="center">
<img src="https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/bench.gif" width="48%" alt="台架 A · sEMG 肌电 + 泵"> <img src="https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/aircell.gif" width="48%" alt="台架 B · 气囊样件">
</p>

**预览 · 在线 Demo**：[🌐 GitHub Pages 四端直达](https://kingkazmax.github.io/kneeup-aix-origin-2026-vital/)（`/patient` `/doctor` `/simulator` `/dashboard`，任意浏览器可运行、无需登录、全部合成数据）

<details>
<summary>完整视频与字幕文件（release v1.0 直链）</summary>

- 路演正片完整带声版 MP4（180s）+ 可编辑 SRT
- 原型讲解完整版 MP4（70s）
- 台架 A 完整版 MP4（27s）
- 台架 B 完整版 MP4（179s；另有 <10MB 网络压缩版）

全部在 [release v1.0](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/tag/v1.0) 资产列表中。
</details>

## 🖥 在线演示

| 端 | 评委现场走什么 |
|---|---|
| **患者端** `/patient` | 每日症状打卡 → AI 训练建议 → 实时训练模式（三路实时图表 + 三态安全灯）→ AI 训练报告 |
| **医生端** `/doctor` | 患者列表 → **AI 周报摘要**（不逐条看数据）→ 调整训练计划 → 下发 |
| **设备模拟器** `/simulator` | 虚拟 Kneeup 护膝：脚本/手动双模式，10Hz 合成信号推流，触发 SAFE→RISK→OVER 状态机 |
| **AI 数据大屏** `/dashboard` | 1080p 一屏：风险分级牌、趋势图、摘要轮播、`AI LAYER ACTIVE` |

**90 秒闭环**：医生看摘要 → 下发计划 → 患者打卡 → 训练（模拟器推流；约 62 秒黄灯*代偿提示*、约 84 秒红灯*压力超限→自动泄气*）→ AI 报告 → 医生收到新摘要。一镜到底。

<p align="center">
<img src="assets/kw_landing.png" width="92%" alt="kneeup-web 旗舰演示站落地页 · 碳黑×钴蓝">
</p>

<p align="center">
<img src="assets/knee_patient.png" width="48%" alt="用户端 · 今日概览（SIMULATED）"> <img src="assets/knee_simulator.png" width="48%" alt="模拟训练演示 · 实时指标（SIMULATED）">
</p>
<p align="center">
<img src="assets/knee_doctor.png" width="48%" alt="教练端 · 风险分层名单与计划设定（SIMULATED）"> <img src="assets/knee_dashboard.png" width="48%" alt="AI 数据屏 · sEMG×膝角双通道实时曲线（SIMULATED）">
</p>
<p align="center">
<img src="assets/kw_3d_preview.gif" width="92%" alt="护具 3D 预览（GIF）——360° 环绕 + 推进放大看细节：自研 CAD（196MB OBJ · 102 万面）瘦身为 GLB Web 档，浏览器内实时运行">
</p>
<p align="center">
<img src="assets/kw_3d_lab.png" width="92%" alt="护具 3D 实验室 · 自研 CAD 模型 12.8 万面，浏览器内直转">
</p>

<p align="center"><img src="assets/arch.png" width="92%" alt="全链路闭环架构：医生端 → 患者端 → 硬件安全状态机 → AI 数据层（合成数据）"></p>

> 截图来自 kneeup-web 旗舰演示站（vanilla ES-Modules，three.js / MediaPipe / Draco 全部 vendor 入库，断网可跑），按本地素材库与碳黑×钴蓝 UI 规范重制；数据均为 SIMULATED 标注。

## 🎨 设计愿景板 — KNEEUP AI 膝关节健康生态

十张板讲完整个生态愿景：Web 落地页、实时 AI 动作分析、3D 产品探索、研究数据洞察、AI 照护看板、App 引导配对、实时深蹲分析、AI 康复教练、进展分析、设备生态控制——全部沿用与演示构建一致的碳黑×钴蓝 UI 规范。

> **透明度声明**：以下为 AI 辅助生成的**概念设计图**（图像生成），用于定设计方向，**并非产品实拍截图**。比赛期间真实构建的运行截图见下方[🖥 在线演示](#-在线演示)。

<p align="center">
<img src="assets/boards/kw_board_01.png" width="92%" alt="板 01 — Web 落地页与产品总览：Your knee, measured live">
</p>
<p align="center">
<img src="assets/boards/kw_board_02.png" width="48%" alt="板 02 — 实时 AI 动作分析：实时生物力学"> <img src="assets/boards/kw_board_03.png" width="48%" alt="板 03 — 3D 产品体验：360° 查看器与爆炸结构">
</p>
<p align="center">
<img src="assets/boards/kw_board_04.png" width="48%" alt="板 04 — 研究数据洞察：临床与生物力学"> <img src="assets/boards/kw_board_05.png" width="48%" alt="板 05 — AI 照护看板：个性化报告与建议">
</p>
<p align="center">
<img src="assets/boards/kw_board_06.png" width="48%" alt="板 06 — App 引导：欢迎与设备配对"> <img src="assets/boards/kw_board_07.png" width="48%" alt="板 07 — 实时深蹲分析：AI 动作捕捉">
</p>
<p align="center">
<img src="assets/boards/kw_board_08.png" width="48%" alt="板 08 — AI 康复教练：个性化训练计划"> <img src="assets/boards/kw_board_09.png" width="48%" alt="板 09 — 进展分析：康复追踪与报告">
</p>
<p align="center">
<img src="assets/boards/kw_board_10.png" width="92%" alt="板 10 — 设备生态：Web + App 智能设备控制">
</p>

## ✅ Checkpoint 证据对位表（按官方评审维度）

| 评审维度 | 本仓库可核验证据 |
|---|---|
| **项目进展（40 分）** | 核心闭环已完成且可演示：Pages 四端在线 + 交付演示应用（`knee-ai-demo/`）；自动化测试全绿——Node **55/55**、后端 **23/23**、固件主机替身 **6/6**（70 轮逐帧比较）；git 历史自 2026-09-04 起按里程碑提交；剩余工作边界见[进展说明](docs/31-Checkpoint进展说明.md) §二 |
| **技术路线可行性（20 分）** | 架构与关键选型有据（`docs/` A9/B9）；关键假设已验证：串口双协议解析（legacy/v1、去重、超时）、离线姿态估计（MediaPipe 全 vendor，髋膝踝不全时角度保持 null 不编造）、种子化确定性合成引擎；风险清单 + 三层降级预案（LLM 断网→模板；姿态失效→无摄像头模式；终极兜底→预录视频） |
| **团队执行力（20 分）** | 分工与交接留痕（`knee-ai-demo/CODEX_HANDOFF.md`、`docs/LOOP-STATE.md`）；每小时迭代 loop 逐轮记录；问题当日暴露当日闭环（品牌/仓库改名连锁失效一次巡检内修复）；决策日志见 `v2/迭代日志.md` |
| **问题与场景清晰度（20 分）** | 目标用户与情境具体：60–75 岁仍能自主行动人群的居家训练日；痛点证据全部带出处（WHO 3.65 亿、香港 72 个月轮候、约 50% 居家计划放弃）；现有替代方案已对标（`docs/12-竞品与对标.md`）；价值假设配套定义好的四周社区试点验证计划（记录完整度/审阅耗时/使用负担/继续意愿） |

完整叙事：**[Checkpoint 进展说明](docs/31-Checkpoint进展说明.md)**（已完成 / 剩余及计划 / 技术难点）。

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
# 生产构建：生成 out/ 静态导出（可托管任意静态主机）
npm run build && npx serve out
```

交付演示应用（USB 只读观察 + 本地姿态估计 + AI 观察层 + 同机专业复核）：

```bash
cd knee-ai-demo
python3 serve.py   # http://localhost:8000
```

## 📁 仓库结构

```
├── web/                  # Next.js 14 应用（App Router / TS / Tailwind / Recharts）
│   ├── src/app/          # /patient /doctor /simulator /dashboard 四端
│   ├── src/lib/synth/    # 确定性合成信号引擎 + 安全状态机
│   └── out/              # 静态导出（可托管任意静态主机）
├── knee-ai-demo/         # 交付演示应用（serve.py；测试 55/55 node + 23/23 后端 + 6/6 固件替身）
│   ├── firmware/         # 遥测固件 + 原始参考程序
│   └── vision-vendor/    # MediaPipe Tasks Vision，vendor 入库离线可跑
├── docs/                 # 情报、讲稿、合规包（中文）
│   ├── 00-情报库v2.md     # 唯一事实源
│   ├── 15-合规文案包.md   # 免责声明与禁用词包
│   ├── 30-提交说明与诚信自查.md
│   └── 31-Checkpoint进展说明.md
└── assets/               # 赛前硬件研究（MENISCUS SHIELD）+ 演示截图
```

## 🦿 硬件背景（赛前研究）

<p align="center">
<img src="assets/pdf/page-1.png" width="92%" alt="MENISCUS SHIELD 概念与灵感">
</p>
<p align="center">
<img src="assets/pdf/page-2.png" width="92%" alt="研究 · 半月板损伤数据与治疗方式">
</p>
<p align="center">
<img src="assets/pdf/page-3.png" width="92%" alt="分析 · Persona 与用户旅程图">
</p>
<p align="center">
<img src="assets/pdf/page-4.png" width="92%" alt="Arduino 可运行原型">
</p>
<p align="center">
<img src="assets/pdf/page-5.png" width="92%" alt="爆炸图与穿戴实拍">
</p>

软件闭环延伸自工业设计研究 **MENISCUS SHIELD**——自适应膝关节护具概念（硅胶气囊 + sEMG + 关节腔压感知；屈膝充气支撑、伸直放气复位；超压自动泄气），已有 Arduino 可运行原型（完整研究页见上方，源文件在 `assets/pdf/`）。本次参赛主体是 **Soft Healthcare 软件闭环**，硬件为下一步路线图。

台架影像：[sEMG + 泵台架（27 秒）](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-bench-semg-pump-27s.mp4) · [气囊样件（179 秒）](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-aircell-samples-179s.mp4) · [原型讲解（70 秒）](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-prototype-explanation-70s.mp4)

### ✏️ 从草图到模具——过程证据

<p align="center">
<img src="assets/hw/sketch_ideation.jpg" width="92%" alt="手绘推敲——护具形态与气囊结构探索">
</p>
<p align="center">
<img src="assets/hw/cad_4view.jpg" width="92%" alt="CAD 模型——四视图工程布局（顶视 / 透视 / 后视 / 左视）">
</p>
<p align="center">
<img src="assets/hw/mold_top.jpg" width="48%" alt="3D 打印气囊气道模具（俯视）"> <img src="assets/hw/mold_side.jpg" width="48%" alt="3D 打印气囊气道模具（侧视）">
</p>
<p align="center">
<img src="assets/hw/silicone_cast_1.jpg" width="48%" alt="硅胶气囊浇筑——模具与脱模硅胶片"> <img src="assets/hw/silicone_cast_2.jpg" width="48%" alt="硅胶浇筑过程——气囊片成型中">
</p>

### 🔌 AIR-FLOW Knee+——已验证硬件链路与 Web 接入计划

<p align="center">
<img src="assets/hw/airflow_pipeline.png" width="92%" alt="AIR-FLOW 膝部辅助原型——已验证链路：肌电 → 放大滤波 → Arduino UNO → 阈值判断 → 继电器 → 气泵/三通阀 → 气囊；下一步：Web Serial 实时可视化 + AI 建议层">
</p>

> 当前已验证（实线）：腿部肌电传感器 → 放大/滤波 → Arduino UNO（串口实时输出）→ 阈值控制 → 继电器 → 气泵/三通阀 → 气囊充放气。进行中（虚线）：Web Serial 实时画面 → AI 生成建议与解释。膝关节角度 / 压力反馈 / IMU 为路线图模块——**只演示已验证的部分**。

### 🖼 概念渲染

<p align="center">
<img src="assets/hw/render_wearing.jpg" width="92%" alt="穿戴渲染——AIR-FLOW Knee+ 户外上腿效果">
</p>
<p align="center">
<img src="assets/hw/render_exploded.jpg" width="48%" alt="爆炸渲染——全部件分解"> <img src="assets/hw/render_hanging.jpg" width="48%" alt="悬挂陈列渲染——模块化布局">
</p>

## ⚖️ 伦理与合规声明

- 本产品为**康复训练辅助软件，非医疗器械**，不诊断、不治疗、不开处方、不替代专业诊疗。
- 每页常驻显著免责声明（中英）；危机信号转介「尽快就医」。
- **全部数据为合成数据**——3 个虚构患者档案、种子化生成器、零真实患者数据（页脚已注明）。
- 最少收集原则：演示状态仅存于浏览器。
- 诚信说明：赛前研究 = 硬件概念与设计研究（已注明）；`web/` 与 `knee-ai-demo/` 全部为比赛期间开发（见 git 历史）。

## 🏆 团队

**自由意志 · Free Will** — AIx Origin Summit 2026 · Vital 活域赛道 · 香港（数码港）

队长：蔡智鑫（工业设计）· 完整名单见提交表。

## 📄 许可证

[MIT](LICENSE) — 比赛期间构建 © 2026 自由意志队。赛前设计研究（MENISCUS SHIELD 素材）© 万博阳。
