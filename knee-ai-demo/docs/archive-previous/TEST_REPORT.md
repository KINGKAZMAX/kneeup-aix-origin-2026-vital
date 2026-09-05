# 当前 AI 观察版测试报告 · 2026-09-05

真实模型 API：**未验证**（未提供服务配置与凭证）。真实 USB：**未验证**（开发者没有设备）。气动、烧录、穿戴和临床效果：**未验证/未操作**。

| 测试层级 | 本轮结果 | 证据与范围 |
|---|---|---|
| 协议单元 | 9/9 | `node --test tests/protocol.test.cjs`；legacy/v1/重复帧基础解析 |
| 主机固件替身 | 6/6 | `python3 tests/native_firmware_test.py`；70 轮逻辑对比，非 AVR 编译/烧录 |
| 原浏览器回归 | 23/23 | 实际本机 HTTP 导航、Chrome、模拟 Web Serial，下载 CSV；非真实 USB |
| AI 摘要/异步单元 | 15/15 | `node --test tests/ai-observer.test.cjs`；合成输入与 fetch 替身 |
| 后端/HTTP | 19/19 | `python3 tests/ai_backend_test.py`；输入/输出/证据/错误、并发/限流、白名单/同源 |
| AI 浏览器端到端 | 19/19 | 本机 HTTP 页面 → 生产代理 → 本机 MOCK_NOT_REAL 上游；授权、等待、异常、导出、移动布局 |

浏览器环境：macOS 本机 Chrome，Playwright 安装在项目 `.venv`，未禁用产品 CSP。应用运行本身无需 Playwright。首次基线发现系统 Python 未安装 Playwright，安装项目测试环境后复跑通过。最初沙箱不允许监听，获得工具审批后仅绑定回环地址运行。

新增测试覆盖：signed 值、缺项、重复 seq 去重、旧样本/新状态帧、样本数/跨度门槛、无基线、未配置/未授权不请求、超时/断网/401/403/429/5xx、非法 JSON/超长内容/未知动作/伪造证据/HTML、来源和 generation 归属、重连/协议变化/重启/撤销/过期晚回包丢弃、单并发及最小调用间隔。浏览器验证模型等待时曲线继续增加，切换页面仍一次点击一次请求。

静态服务只允许 index、明确 JS/CSS 文件，不提供目录、文档、Python、.env、日志或 symlink。测试了编码/双重编码/点路径与非同源 POST、错误 Host、CSRF、请求体大小。模型元数据由服务器设置，输出没有执行硬件的路径；密钥没有进入状态/响应或测试导出。

`docs/test-output/ai-browser-report.json` 和 `browser-report.json` 是本轮浏览器结果。`ai-synthetic-mock-*.png` 为带测试标注的界面截图，其中 MOCK_NOT_REAL 是接口替身，**不是成功调用真实模型的证据**。测试窗口来源 synthetic/simulated；测试专用服务缩短调用间隔，生产默认仍为 10 秒。

自然语言内容过滤为保守拦截，不能证明全部模型解释准确。不同供应商对 Chat Completions JSON 格式的支持、真实账号权限和现场网络需队友核对。客户端撤销不能撤回已发送数据；接口没有自动重试。完整会话包含记录期间发起的 AI 请求，记录结束后返回仍绑定原会话，不迁入新会话。

具体启动与验收步骤见 `README.md`、`FIELD_DEMO.md`。旧交接文件里的“尚无 AI”“静态根目录服务”和旧通过计数是历史状态，以本报告及当前源码为准。

## 本轮改动文件

- 新增 `ai_backend.py`、`ai-observer.js`、`ai-ui.js`：服务端适配/校验、窗口摘要与异步归属、AI 观察及历史 UI。
- 修改 `serve.py`：静态白名单、loopback/Host/Origin/CSRF、API 路由；新增 `.env.example`、`.gitignore`。
- 小幅修改 `live-ui.js`、`index.html`、`hardware.css`：沿用原卡片样式，挂接单一 device、固定输入展示与会话 `aiHistory`。
- 新增 AI 单元/后端/浏览器测试与 fixtures；原 `browser_smoke.py` 的隔离加载列表包含新增模块。
- 更新 `README.md`、`TEST_REPORT.md`、交接状态说明、`start.command` 提示；新增 `FIELD_DEMO.md`、`tools/package_release.py`。
- 没有修改 `serial-protocol.js`、`serial-device.js`、`app.js`、`styles.css` 或固件。

## 历史 USB 版本报告（保留原文）

# AIR-FLOW USB 接入版 · 验证记录

[Unverified] 未使用实体 Arduino、传感器、继电器、气泵或电磁阀测试；不代表硬件接入、气动效果或安全性已经通过验收。

## 实际完成

| 检查 | 结果 | 边界 |
|---|---|---|
| JavaScript 语法 | 通过 | Node 静态语法检查 |
| 协议单元测试 | 9/9 通过 | 数值/JSON、分包、无效行、过长行、时间回绕 |
| 浏览器界面/生命周期 | 23/23 通过 | Chromium + 模拟串口及隔离 DOM 测试环境 |
| 主机固件逻辑检查 | 6/6 通过 | g++ + Arduino 函数替身，不是 AVR 编译 |
| 原程序与上报版逻辑对照 | 70 轮 GPIO/等待轨迹一致 | 不包括明确说明的启动差异与真实发送耗时 |
| 固件输出→前端协议解析 | 81/81 行可解析 | 主机模拟生成的 NDJSON，不是实板输出 |
| 桌面/手机界面截图 | 已查看 | 手机布局通过横向溢出检查，不代表手机 USB 支持 |

## 浏览器测试说明

环境的 Chromium 禁止 URL 导航。没有修改或移除策略；直接将包内的 HTML、CSS、JS 加载到隔离空白页。测试替身提供了串口、secure context、localStorage 与文件下载点击。

因此本次验证覆盖了页面渲染、协议处理、半行数据、异常输入、重连、过期数据、重启、只读约束、记录与 CSV 内容生成，但**没有验证真实 USB 选择弹窗、真实 localhost 浏览器访问、设备驱动、本机文件下载弹窗、持久存储权限或实板行为**。

原始结果：`docs/test-output/browser-report.json`、`firmware-native-report.json`。

## 现场仍须验收

先断开气泵外部电源，以原固件完成串口数据读取。确认页面数值与 Arduino 串口监视器单独运行时所见一致；两者不要同时占用端口。然后由硬件负责人检查实际执行、停止及泄压方式。可选新固件先做 Arduino IDE 验证，再进行台架回归。

仅推荐在完成上述实机检查后，把对应链路称为“已接通”。
