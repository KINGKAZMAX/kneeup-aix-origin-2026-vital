<div align="center">

# Kneeup 膝望

**AI rehabilitation companion that brings knee rehab from hospital to home** · Soft Healthcare software loop

[![Track](https://img.shields.io/badge/Track-Vital_%E6%B4%BB%E5%9F%F9_AF6262?style=flat-square)](https://aixorigin.innoai.org.cn)
[![Event](https://img.shields.io/badge/AIx_Origin_Summit-2026_HK_·_Cyberport-38E1D4?style=flat-square)](https://aixorigin.innoai.org.cn)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-3-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · [简体中文](README.zh-CN.md)

</div>

---

> **"I don't want to just be a patient — I want to climb mountains again, smarter."**
> — Zhiyuan, 62, retired architect, post meniscus surgery *(synthetic persona)*

**The problem**: knee osteoarthritis affects 365M people worldwide (WHO). In Hong Kong, public-hospital knee replacement waits stretch up to **72 months** (LegCo 2022), and ~**50%** of home exercise programs are abandoned (Argent 2018). The bottleneck of rehab is not in the hospital — it's in every unsupervised day at home.

**Kneeup 膝望** closes that loop with three connected web portals and an AI data layer: patients check in daily and train with real-time safety feedback; clinicians review **AI-generated weekly digests** instead of raw data and adjust training plans; a device simulator streams synthetic sEMG / joint-pressure / flexion signals and reproduces the safety state machine of our pre-competition hardware prototype (**MENISCUS SHIELD**, Arduino + air-cell brace). **Remove the AI layer and the loop collapses** — personalized advice, compensation-pattern detection, risk grading and clinician digests are all AI-driven.

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

## 🎬 3-Minute Submission Video (roadshow cut)

**[▶ Kneeup 膝望 — 3-minute submission video (MP4, ~4 MB, zh narration + embedded subtitles)](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-3min-submission-video.mp4)** · [editable SRT](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/download/v1.0/Kneeup-3min-submission-video.srt) · [release notes](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital/releases/tag/v1.0)

Every shot carries an on-screen source label: pre-competition hardware/bench footage vs. hackathon-built software (real session screenshots, synthetic inputs) — disclosed per Vital track transparency rules.

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

## 📁 Repository Structure

```
├── web/                  # Next.js 14 app (App Router, TS, Tailwind, Recharts)
│   ├── src/app/          # /patient /doctor /simulator /dashboard
│   ├── src/lib/synth/    # deterministic synthetic-signal engine + safety FSM
│   └── out/              # static export (deployable to any static host)
├── docs/                 # research intel, pitch scripts, compliance pack (zh)
│   ├── 00-情报库v2.md     # single source of truth
│   ├── 15-合规文案包.md   # disclaimer & banned-word pack
│   └── 30-提交说明与诚信自查.md
└── assets/               # hardware research (MENISCUS SHIELD) + screenshots
```

## 🦿 Hardware Background (Pre-competition Research)

The software loop extends our industrial-design research **MENISCUS SHIELD** — an adaptive knee brace concept (silicone air-cells + sEMG + joint-pressure sensing; inflate on flexion for support, deflate at rest; auto blow-off on over-pressure), with a working Arduino prototype (below, full study in `assets/pdf/`). The competition build focuses on the **Soft Healthcare software loop**; hardware remains the roadmap.

<p align="center">
<img src="assets/pdf/page-4.png" width="46%" alt="Arduino prototype"> <img src="assets/pdf/page-5.png" width="46%" alt="Exploded view & wearing shots">
</p>

## ⚖️ Ethics & Compliance Statement

- This is a **rehab-training companion, NOT a medical device**. It does not diagnose, treat, prescribe, or replace professional care.
- Every page carries a persistent disclaimer (zh + en); crisis signals route to "seek medical care".
- **All data is synthetic** — 3 fictional patient personas, seeded generators, zero real patient data (page footer states this).
- Minimal data collection: the demo stores state in the browser only.
- Honesty statement: pre-competition research = hardware concept & design study (declared); everything in `web/` was built during the hackathon window (see git history).

## 🏆 Team

**自由意志 · Free Will** — AIx Origin Summit 2026, Vital Track, Hong Kong (Cyberport).

Lead: Boyang Wan (Industrial Design, [waffledesign.site](https://waffledesign.site)) · full roster in the submission form.

## 📄 License

[MIT](LICENSE) — competition build © 2026 Team Free Will. Pre-competition design research (MENISCUS SHIELD assets) © Wan Boyang.
