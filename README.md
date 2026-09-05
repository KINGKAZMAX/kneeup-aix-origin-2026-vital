<div align="center">

# Kneeup 膝望

**AI rehabilitation companion that brings knee rehab from hospital to home** · Soft Healthcare software loop

[![Track](https://img.shields.io/badge/Track-Vital_%E6%B4%BB%E5%9F%9F_AF6262?style=flat-square)](https://aixorigin.innoai.org.cn)
[![Event](https://img.shields.io/badge/AIx_Origin_Summit-2026_HK_·_Cyberport-38E1D4?style=flat-square)](https://aixorigin.innoai.org.cn)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-3-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md)

**[🌐 Live Demo (GitHub Pages)](https://kingkazmax.github.io/kneeup-aix-origin-2026-vital/)** · **[🎬 3-min Video](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-3min-submission-video.mp4)** · **[📄 Checkpoint 进展说明](docs/31-Checkpoint进展说明.md)**

</div>

---

> **"I don't want to just be a patient — I want to climb mountains again, smarter."**
> — Zhiyuan, 62, retired architect, post meniscus surgery *(synthetic persona)*

**The problem**: knee osteoarthritis affects 365M people worldwide (WHO). In Hong Kong, public-hospital knee replacement waits stretch up to **72 months** (LegCo 2022), and ~**50%** of home exercise programs are abandoned (Argent 2018). The bottleneck of rehab is not in the hospital — it's in every unsupervised day at home.

**Kneeup 膝望** closes that loop with connected web apps and an AI data layer: patients check in daily and train with real-time safety feedback; clinicians review **AI-generated weekly digests** instead of raw data and adjust training plans; a device simulator streams synthetic sEMG / joint-pressure / flexion signals and reproduces the safety state machine of our pre-competition hardware prototype (**MENISCUS SHIELD**, Arduino + air-cell brace). **Remove the AI layer and the loop collapses** — personalized advice, compensation-pattern detection, risk grading and clinician digests are all AI-driven.

## 🎬 Video Gallery

| Type | Video | Length | What it shows |
|---|---|---|---|
| **展示视频 · Pitch** | [▶ 3-min submission video (zh narration + embedded subtitles)](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-3min-submission-video.mp4) · [SRT](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-3min-submission-video.srt) | 180 s | Full story: problem → product loop → software walkthrough (real session captures) → pilot plan. Every shot carries an on-screen source label per Vital transparency rules |
| **Demo 视频 · Prototype explainer** | [▶ MENISCUS SHIELD prototype explanation](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-prototype-explanation-70s.mp4) | 70 s | Pre-competition hardware prototype walk-through (declared pre-existing work) |
| **实验视频 · Bench A** | [▶ sEMG electrodes + controller + pump bench](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-bench-semg-pump-27s.mp4) | 27 s | Real sEMG sensing chain on leg + pump/controller bench footage |
| **实验视频 · Bench B** | [▶ Silicone air-cell samples](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-aircell-samples-179s.mp4) | 179 s | Air-cell sample exploration footage (material/structure evidence, not an efficacy claim) |
| **预览 · Live Demo** | [🌐 GitHub Pages — 4 routes](https://kingkazmax.github.io/kneeup-aix-origin-2026-vital/) (`/patient` `/doctor` `/simulator` `/dashboard`) | — | Runnable in any browser, no login; all synthetic data |

## 🖥 Live Demo

| Portal | What judges walk through |
|---|---|
| **Patient** `/patient` | Daily symptom check-in → AI training advice → live training mode (3 real-time charts + 3-state safety light) → AI session report |
| **Clinician** `/doctor` | Patient list → **AI weekly digest** (no raw-data digging) → adjust training plan → dispatch |
| **Device Simulator** `/simulator` | Virtual Kneeup brace: scripted or manual control, streams 10 Hz synthetic signals, triggers SAFE→RISK→OVER state machine |
| **AI Dashboard** `/dashboard` | 1080p one-screen: risk grades, trends, digest carousel, `AI LAYER ACTIVE` |

**90-second walk-through**: clinician reads digest → dispatches plan → patient checks in → trains (simulator streaming; ~62 s yellow *compensation* alert, ~84 s red *over-pressure → auto blow-off*) → AI report → clinician sees new digest. One take, one story.

<p align="center">
<img src="assets/kw_landing.png" width="92%" alt="kneeup-web flagship landing — carbon black × cobalt blue">
</p>

<p align="center">
<img src="assets/knee_patient.png" width="48%" alt="Patient app — today overview (SIMULATED)"> <img src="assets/knee_simulator.png" width="48%" alt="Simulated training demo — live metrics (SIMULATED)">
</p>
<p align="center">
<img src="assets/knee_doctor.png" width="48%" alt="Coach console — risk-tiered roster & plan setting (SIMULATED)"> <img src="assets/knee_dashboard.png" width="48%" alt="AI data screen — dual-channel sEMG × knee-angle stream (SIMULATED)">
</p>
<p align="center">
<img src="assets/kw_3d_lab.png" width="92%" alt="3D brace lab — self-developed CAD model, 128k faces, in-browser">
</p>

<p align="center"><img src="assets/arch.png" width="92%" alt="Architecture"></p>

> Screenshots: `kneeup-web` flagship demo station (vanilla ES-modules, vendored three.js / MediaPipe / Draco — runs fully offline), built from the local material library under the carbon-black × cobalt-blue UI spec. All data labeled SIMULATED.

## ✅ Checkpoint Evidence Map (per official rubric)

| Rubric dimension | Verifiable evidence in this repo |
|---|---|
| **项目进展 / Progress (40)** | Core loop complete & demonstrable: 4-route live demo on Pages + delivery app (`knee-ai-demo/`); automated tests green — Node **55/55**, backend **23/23**, firmware host-mock **6/6** (70-loop trace comparison); git history starts 2026-09-04 with milestone commits; remaining work bounded in [进展说明](docs/31-Checkpoint进展说明.md) §二 |
| **技术路线可行性 / Feasibility (20)** | Architecture & key selections documented (`docs/` A9/B9); validated assumptions: serial protocol parsing (legacy/v1, dedup, timeout), offline pose estimation (vendored MediaPipe, angles stay null when hip/knee/ankle incomplete — no fabrication), deterministic seeded synthetic engine; risk register + 3-layer degradation plan (LLM offline → templates; pose fails → no-camera mode; total fallback → pre-recorded video) |
| **团队执行力 / Execution (20)** | Role split & handoffs on record (`knee-ai-demo/CODEX_HANDOFF.md`, `docs/LOOP-STATE.md`); hourly iteration loops with logged rounds; issues surfaced & closed same-day (brand/repo rename chain fixed within one patrol); decision log `v2/迭代日志.md` |
| **问题与场景清晰度 / Problem clarity (20)** | Target user & context specific: 60–75 community-dwelling adults, home training days; pain evidence with sources (WHO 365M, HK 72-month wait, ~50% abandonment); existing alternatives benchmarked (`docs/12-竞品与对标.md`); value hypothesis with a defined 4-week community pilot verification plan (record completeness / review time / burden / continued-use willingness) |

Full narrative: **[Checkpoint 进展说明](docs/31-Checkpoint进展说明.md)** (completed / remaining & plan / technical difficulties).

## ✨ Key Features

- 🌡 **Daily check-in with crisis referral** — pain ≥ 6 / red-flag symptoms surface "please seek medical care promptly" (no medical advice given)
- 🛡 **Safety state machine** (SAFE / RISK / OVER with hysteresis) reproducing the hardware behavior: *stop pressurizing → immediate deflation → suggest pause*
- 📈 **Deterministic synthetic signals** — seeded PRNG (no `Math.random()`), 10 Hz sEMG envelope / MDF proxy / joint pressure / flexion angle; every demo replay is pixel-identical
- 🤖 **AI transparency by design** — every AI output is labeled; see the [transparency table](#-ai-transparency)
- 🏥 **Clinician-side AI digests** — 7-day trends, compensation patterns, A/B/C risk grade, plan-adjustment suggestions (advisory, non-medical)
- ⚖️ **Compliance-first copy** — full-stack banned-word audit (zero hits for 诊断/治疗/处方/治愈), persistent disclaimer on every page

## 🤖 AI Transparency

Per Vital track rules, we disclose exactly what is model-generated vs. rule-based:

| Capability | Current implementation | Roadmap |
|---|---|---|
| Safety state machine (risk score, OVER trigger) | **Deterministic rules** (physics-inspired signal model, auditable) | Stays rules — safety must not hallucinate |
| Training advice / session report / weekly digest | **Local rule-engine + templates** (`src/lib/ai.ts`, `AI_MODE=local-fallback`) | LLM upgrade path wired (`POST /api/ai`, 2 s timeout, template fallback) — offline-safe by design |
| Compensation-pattern detection | Signal-model indices (amplitude decay + MDF drop) | On-device ML |

No keys are committed; no external API is called in the demo build (**no cross-border data transfer** — everything runs in the browser).

## 🚀 Quick Start

```bash
cd web
npm install
npm run dev        # http://localhost:3000
# production static export (already included in web/out)
npm run build && npx serve out   # production build → static export in out/
```

Delivery demo app (USB read-only observation + on-device pose estimation + AI observation layer + same-machine professional review):

```bash
cd knee-ai-demo
python3 serve.py   # http://localhost:8000
```

## 📁 Repository Structure

```
├── web/                  # Next.js 14 app (App Router, TS, Tailwind, Recharts)
│   ├── src/app/          # /patient /doctor /simulator /dashboard
│   ├── src/lib/synth/    # deterministic synthetic-signal engine + safety FSM
│   └── out/              # static export (deployable to any static host)
├── knee-ai-demo/         # delivery demo app (serve.py; tests 55/55 node + 23/23 backend + 6/6 firmware mock)
│   ├── firmware/         # telemetry firmware + original reference sketch
│   └── vision-vendor/    # MediaPipe Tasks Vision, vendored for offline
├── docs/                 # research intel, pitch scripts, compliance pack (zh)
│   ├── 00-情报库v2.md     # single source of truth
│   ├── 15-合规文案包.md   # disclaimer & banned-word pack
│   ├── 30-提交说明与诚信自查.md
│   └── 31-Checkpoint进展说明.md
└── assets/               # hardware research (MENISCUS SHIELD) + screenshots
```

## 🦿 Hardware Background (Pre-competition Research)

<p align="center">
<img src="assets/pdf/page-1.png" width="92%" alt="MENISCUS SHIELD — concept & inspiration">
</p>
<p align="center">
<img src="assets/pdf/page-2.png" width="92%" alt="Research — meniscus injury data & treatment options">
</p>
<p align="center">
<img src="assets/pdf/page-3.png" width="92%" alt="Analysis — persona & user journey map">
</p>
<p align="center">
<img src="assets/pdf/page-4.png" width="92%" alt="Arduino working prototype">
</p>
<p align="center">
<img src="assets/pdf/page-5.png" width="92%" alt="Exploded view & wearing shots">
</p>

The software loop extends our industrial-design research **MENISCUS SHIELD** — an adaptive knee brace concept (silicone air-cells + sEMG + joint-pressure sensing; inflate on flexion for support, deflate at rest; auto blow-off on over-pressure), with a working Arduino prototype (full study pages above, source files in `assets/pdf/`). The competition build focuses on the **Soft Healthcare software loop**; hardware remains the roadmap.

Bench footage: [sEMG + pump bench (27 s)](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-bench-semg-pump-27s.mp4) · [air-cell samples (179 s)](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-aircell-samples-179s.mp4) · [prototype explainer (70 s)](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-prototype-explanation-70s.mp4)

## ⚖️ Ethics & Compliance Statement

- This is a **rehab-training companion, NOT a medical device**. It does not diagnose, treat, prescribe, or replace professional care.
- Every page carries a persistent disclaimer (zh + en); crisis signals route to "seek medical care".
- **All data is synthetic** — 3 fictional patient personas, seeded generators, zero real patient data (page footer states this).
- Minimal data collection: the demo stores state in the browser only.
- Honesty statement: pre-competition research = hardware concept & design study (declared); everything in `web/` and `knee-ai-demo/` was built during the hackathon window (see git history).

## 🏆 Team

**自由意志 · Free Will** — AIx Origin Summit 2026, Vital Track, Hong Kong (Cyberport).

Lead: Zhixin Cai (Industrial Design) · full roster in the submission form.

## 📄 License

[MIT](LICENSE) — competition build © 2026 Team Free Will. Pre-competition design research (MENISCUS SHIELD assets) © Wan Boyang.
