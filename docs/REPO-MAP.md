# Kneeup 膝望 · 代码库地图（REPO MAP）

> 本机全部 Web 前/后端代码的 GitHub 分布与整合索引。最后更新：2026-09-06（kimi 总控盘点）。

## 一图看懂

| 代码库 | 内容 | GitHub | 在线地址 | 定位 |
|---|---|---|---|---|
| **主仓库** `AIR-FLOW-Knee/` | Next.js 四端（`web/`）+ 交付演示应用（`knee-ai-demo/`，serve.py 前后端一体）+ 全部 docs/情报/合规包 | [kneeup-aix-origin-2026-vital](https://github.com/KINGKAZMAX/kneeup-aix-origin-2026-vital) (public) | [Pages 四端](https://kingkazmax.github.io/kneeup-aix-origin-2026-vital/) | 评审主入口、诚信 git 链 |
| **旗舰演示站** `项目二/前端/kneeup-web/` | vanilla ES-Modules 落地页 + 应用壳（用户/教练/AI屏/游戏/身体记录/助力等级）+ 3D 实验室；three.js/MediaPipe/Draco 全 vendor 离线可跑 | [kneeup-web](https://github.com/KINGKAZMAX/kneeup-web) (public) | [落地页](https://kingkazmax.github.io/kneeup-web/) · [应用壳](https://kingkazmax.github.io/kneeup-web/apps.html) · [3D 实验室](https://kingkazmax.github.io/kneeup-web/3d.html) | 正式演示入口（手机/电脑直开） |
| **早期 demo** `项目二/meniscus-shield-demo/` | 比赛期间首个可跑 knee AI demo（诚信证据链一环） | [meniscus-shield-demo](https://github.com/KINGKAZMAX/meniscus-shield-demo) (public) | — | 历史存档，勿当现行版 |
| **3D 预览** `项目二/前端/kneeup-3d-preview/` | 护具 GLB 查看器雏形（3D 实验室前身） | [kneeup-3d-preview](https://github.com/KINGKAZMAX/kneeup-3d-preview) (public) | — | 存档，3D 以 kneeup-web/3d.html 为准 |

## 不在 GitHub 的（刻意）

| 内容 | 原因 |
|---|---|
| `kneeup-voice/xiaozhi-esp32-server/` | 第三方开源项目 clone（xinnan-tech/xiaozhi-esp32-server），非本队代码，语音线实验用，不发布 |
| `项目二/前端/*.zip`（两份参考前端压缩包） | 他人参考素材，仅作设计参考，不入库 |
| 内部战略手册（*.docx）、`.zcode/`、`.build/` | 内部作战资料，gitignore 拦截 |
| `交付-膝望-20260906/modelscope-20260906/` | 魔搭部署线文档/截图（另一工具产出），属运营材料非代码 |

## 后续整合建议（合并方向）

1. **以 `kneeup-aix-origin-2026-vital` 为中枢**：docs/情报/合规/提交物都在这里；评审只认它。
2. **kneeup-web 是产品前端主线**：后续功能（M5 助理、助力等级、游戏化）在它上面长；Next.js `web/` 四端可逐步被其取代或降为管理端。
3. **knee-ai-demo 是硬件联调线**：真实 USB/台架验证都在它里面做，成熟后其 serial/vision 模块可反哺 kneeup-web。
4. meniscus-shield-demo、kneeup-3d-preview 冻结存档，不再开发。

## 给平行工具的纪律

- 改动前先 `git pull --ff-only`；push 失败先 fetch 重试（网络偶发断连）。
- 不 reset --hard 别人未提交的工作区改动。
- 新仓库建好请登记到本表 + 交付包 `总控-STATUS.md`。
