# AIR-FLOW Knee+ · USB + AI 只读观察版

[Unverified] 实板连接、实际气泵/阀门动作与穿戴安全没有在本次环境中验证。本包完成的是前端接入代码和软件层测试，不是完成了实物验收的产品。

## 给现场队友

先看 `FIELD_DEMO.md`。当前开发者没有设备；没有烧录固件、操作气动硬件、公开部署或购买服务。本版运行需 Python 3.9+ 与电脑 Chrome/Edge。项目无运行时第三方 Python/JS 依赖。

## 真实模型配置与授权

1. 本版 `serve.py` 已限定静态文件白名单；先确认使用这一版，再复制 `.env.example` 为项目根目录 `.env`。
2. 使用队伍自己已获授权的模型服务，填写以下所有相关项。不要把密钥发进浏览器、截图或聊天。程序不读取 Codex 登录、其他目录凭证，也不自动购买权限。

```dotenv
AIRFLOW_AI_ADAPTER=chat_completions
AIRFLOW_AI_BASE_URL=
AIRFLOW_AI_MODEL=
AIRFLOW_AI_AUTH_MODE=bearer
AIRFLOW_AI_API_KEY=
```

`BASE_URL` 填供应商文档明确的 API 基址，**不包含 `/chat/completions`**，不含账号密码或查询参数；适配器追加该路径。`MODEL` 填队伍账号可用的准确模型 ID。当前适配器要求支持 `messages`、`response_format: {"type":"json_object"}` 及 `choices[0].message.content` 的 Chat Completions JSON 接口，不保证任意供应商兼容。实现参考 [官方 Chat Completions 接口](https://developers.openai.com/api/reference/resources/chat)；供应商不同或只支持 Responses/其他协议时需另加适配器，不能只换地址假定兼容。

远端模式必须 HTTPS + `bearer` + key。若队伍明确运行了本机无鉴权模型，可用 `AIRFLOW_AI_AUTH_MODE=local_no_auth`，仅允许 localhost/127.0.0.1/::1 地址，key 留空。没有任何默认模型或端点；空模板直接启动时显示“模型未配置 / AI 未连接”。

3. `python3 serve.py --no-browser` 重启服务，访问 `http://localhost:8000/?view=hardware`。环境变量优先于 `.env`；文件按字面 KEY=value 读取，不执行 shell、不支持变量替换或行尾注释。
4. 页面核对完整服务地址与模型，展开“发送字段与授权范围”，勾选同意后再点击“分析当前窗口”。默认不外发；授权只在页面内存中，换源/重连/服务变化需重新确认。

仅发送程序计算的短窗口摘要：来源、协议、窗口时间、样本数/年龄、滤波数值统计、采样间隔、阈值及来源、已上报 A5 标签与变化次数、请求归属字段，`baseline=null`。没有上传原始采样流、身份、视频、会话上下文或完整健康历史。撤销授权会丢弃待处理回复；已送达模型服务的数据无法撤回。

手动分析使用最近 60 秒，至少 5 个有效新样本且跨度至少 4 秒，样本和完整帧均不得超过 7 秒。请求间隔至少 10 秒，全服务并发 1 个，无自动重试。工程门槛在 `ai_backend.py` 的 `GATES` 修改，页面会显示，不是医学门槛。网络 I/O 超时 20 秒，浏览器 25 秒中止；上游流式拖延也有读取预算，正在执行的单次 I/O 最多再等待其超时。断网或失败不会阻塞 USB 曲线。

结果包括观察、枚举建议、引用字段与精确值、限制、模型、生成时间、耗时和固定输入窗口。服务器拒绝多余字段、未知建议、伪造证据、不匹配数字、超长文本及明显越界内容，页面使用文本节点渲染。自然语言过滤不是医学事实证明，模型解释仍需人工核对。失败显示明确规则解释，不能讲成 AI 成功。

没有人工基线采集功能；本轮明确显示“无基线”，不会生成个人变化比较。A5 变化次数统计的是当前窗口起点至请求时刻观察到的输出标签变化，不是动作次数。换源、固件重启、旧样本、断开或窗口超过 60 秒后当前结果失效。

AI 历史保留本页最近 100 次，可单独导出。点“开始记录”后发起的请求附在该会话 `aiHistory` 中，包含输入、来源、状态、结果与请求/生成时间；窗口可能包含开始记录前的最近数据，精确时间单独保存。晚返回结果不会迁入新会话。原 CSV 字段不变；摘要 JSON 仍仅保留原会话统计。刷新前导出完整会话和 AI 历史，波形与 AI 明细不写 localStorage。

## 先做这一件事：原固件不动，读到第一条数据

本包沿用现有纯 HTML/CSS/JS 前端，不需要 npm。USB 观察不需要联网 API；手动 AI 分析需要另行配置模型服务。USB 接在正在展示网页的同一台电脑上。

```text
肌电 → 原 Arduino 程序 → USB 串口（115200）→ 浏览器 Web Serial → 曲线与记录
                   └→ 原有 A5 / 继电器 / 气动执行（仍在硬件端本地运行）
```

网页没有发送硬件控制命令。开始记录不是启动气泵，结束记录不是停泵或泄压。

### 启动

解压到自己的电脑。进入解压后的项目文件夹后，在终端运行：

```bash
python3 serve.py
```

Windows 可运行：

```bat
py -3 serve.py
```

也提供 `start.command`（Mac，可能需要先授权执行）和 `start.bat`（Windows）。这些启动方式要求电脑上已有 Python 3。Mac 终端可直接输入 `cd `，把解压文件夹拖入终端，回车，然后运行上面的命令。

在电脑 Chrome 或 Edge 打开下面地址；若默认启动的是其他浏览器，请复制地址到 Chrome/Edge：

```text
http://localhost:8000/?view=hardware
```

不要在聊天附件预览、嵌套 iframe 或远端预览电脑里尝试选择本机 USB。若 8000 端口被占用，运行 `python3 serve.py --port 8001`，使用终端显示的新地址。服务器仅监听本机回环地址，不负责跨设备通信。

### 连接

1. **先断开气泵外部电源**，由硬件负责人核对继电器/阀门接法和实际停止、泄压方式。不要在穿戴承重状态下初次联调。
2. 通过 USB 数据线连接 Arduino 和这台电脑。先保留当前能工作的原固件。关闭 Arduino IDE 的串口监视器、绘图器及其他占用同一串口的程序或网页。
3. 网页点「连接 Arduino USB」，阅读提示，选择对应串口。波特率固定 115200，与上传的原程序一致。
4. 若原程序仍是每行输出一个数字，页面应显示「原版 · 纯数值」，滤波值和曲线来自实际收到的数据；A0 原始值与 A5 显示未上报。这是正确的边界，不是界面故障。
5. 验证信号后，由硬件负责人在台架上决定何时恢复气动电源并检查实际响应。网页不会替你完成这项检查。

UNO 的串口打开可能伴随自动复位，原程序可能重新运行。这里既没有修改 DTR，也没有发送自动启动命令；只读串口仍不能当作硬件隔离或急停。

## 本轮改动

保留首页、品牌、紫色样式、患者端/护理端与原有概念页面。新增「硬件联动」导航；「开始训练」进入同一实物联动视图。原训练页的示例角度、42% 肌电与支撑百分比没有进入实时页。护理端计划滑块仍是原概念交互，不会控制设备。

| 内容 | 原固件直接连接 | 可选状态上报固件 |
|---|---|---|
| 滤波后肌电数值 | 有 | 有 |
| A0 原始 ADC | 未上报 | 有 |
| 阈值 | 仅原文件中的 66.0 参考值，未从板上回读 | 由固件上报 |
| A5 HIGH/LOW | 未上报，不猜测 | 上报的是控制器指令状态 |
| 气压、实际泵状态、角度、辅助力 | 未接入 | 未接入 |
| 手动 AI 观察 | 配置并授权后分析数字窗口 | 配置并授权后分析遥测窗口 |
| AI / 网页控制气泵 | 未实现 | 未实现 |

“实测”在本包指来自串口的数据，不等于传感器校准、信号质量或临床有效性已经验证。

界面包含最近 60 秒采样点、样本年龄、协议识别、未识别行计数、GPIO 变化日志、开始/结束网页记录、CSV 与完整会话 JSON 导出。7 秒没有有效完整帧时隐藏实时值并结束记录；不会静默切换到合成演示。

## 可选：让前端知道 A5 输出了什么

**原数值链路稳定后再尝试，不是第一步必做。** 新程序位置：

```text
firmware/AIR_FLOW_Telemetry/AIR_FLOW_Telemetry.ino
```

原文件备份：

```text
firmware/original/ZY_Knee_sketch.ino
```

由硬件负责人先对新旧程序做差异检查，再断开气泵外部电源，在 Arduino IDE 中选择实际板型和端口，先「验证」再「上传」。这份可选程序以 UNO 的 A0/A5 接口为目标；尚未完成 Arduino AVR 核心编译或实板烧录测试。

新增内容是 JSON 状态上报。`Filter()` 原文和系数、阈值 66.0、`>=` 比较、4 秒等待和 1 秒等待均保留，不改成连续 500 Hz 采样，不增加来自网页的控制命令。

**它不是逐周期时间完全相同的固件：**串口发送有额外开销；启动阶段先把 A5 输出锁存值预置 HIGH，再设为 OUTPUT。HIGH 是否对应停泵，仍需核实你们的继电器电路。

### 一个重要原代码细节

原程序达到阈值后把 A5 写 LOW，等待 4 秒；紧接着还会等待 1 秒，**直到下一轮开头才写 HIGH**。因此不是精确 4 秒脉冲；LOW 覆盖两段等待以及执行开销。本包状态上报版保留这一顺序，不将 LOW 自动翻译为“已充气”，也不将 HIGH 翻译为“已泄压”。

原程序虽然定义了 `SAMPLE_RATE 500`，实际有阻塞等待，不能宣称现有波形是连续 500 Hz 的原始肌电。短期不要只为了图更平滑就修改采样率：那还涉及滤波器、阈值和触发行为重新验证。

## 记录与数据来源

点「开始记录」之后才记录新的采样。摘要保存在 `airflowUsbSessionsV1` 本地存储键，最多保留 40 条。波形明细只在本页内存中，刷新前导出。单次达到 10000 个采样点会结束记录。

- CSV：每个新采样点一行；包括实际来源 `serial` / `simulated`、接收时间、估算的采样时间、滤波值、可用的 raw/A5/seq 等。旧协议的缺失字段留空。
- 完整会话 JSON：除采样点外还包含记录期间观察到的 A5 变化事件和结束原因。旧协议没有 A5 事件。
- 摘要 JSON：历史会话统计，不含波形明细。

没有生成人体健康评分、疲劳结论、训练完成次数或实际助力百分比；观察到的 HIGH→LOW 次数不等于动作次数。

「显式开启合成演示」只在没有打开实物串口时可用，演示曲线是软件生成的数据。界面与导出都保留来源。它不能证明实物已接通。

## 排错

| 现象 | 先检查 |
|---|---|
| 提示没有 Web Serial | 电脑 Chrome/Edge；顶层页面；localhost 或 HTTPS；不要用附件预览 |
| 选不到设备 | USB 数据线、板卡供电、操作系统是否识别串口；先在 Arduino IDE 确认端口，再关闭监视器回到网页 |
| 端口忙 / 无法打开 | 关闭串口监视器、绘图器、其他终端和重复网页；一次只由一个页面打开该端口 |
| 已打开但没有数据 | 固件是否为所提供版本、115200、每条完整数据是否以换行结束；查看「联调详情」 |
| 1 秒左右一个点 / 触发后长等待 | 这是原程序等待逻辑的限制，不是网页假装实时或曲线故障 |
| A5 显示未上报 | 原固件就是只输出一个浮点数；不要把肌电阈值比较当成气泵状态回读 |
| 7 秒无数据，实时值消失 | 检查供电/串口/程序阻塞；界面不会用假数继续更新 |
| 手机或另一台电脑看不到相同数据 | 本包没有远端转发。真实采集运行在插着 USB 的电脑浏览器里 |
| 症状、气路或执行行为异常 | 使用已经核实的实物停止/泄压流程；网页断开按钮不是停止控制 |

## 软件验证范围

本轮重新运行：协议 9/9、主机固件替身 6/6、原浏览器回归 23/23、AI 摘要/异步归属 15/15、后端/HTTP 19/19、AI 浏览器端到端 19/19。浏览器通过实际本机 HTTP 页面导航与 Chrome 下载文件；串口及模型仍是测试替身，不能视为真实 API 或 USB 通过。详见 `TEST_REPORT.md`。

```bash
node --test tests/protocol.test.cjs tests/ai-observer.test.cjs
python3 tests/native_firmware_test.py
python3 tests/ai_backend_test.py
# 浏览器测试需要单独安装测试依赖；应用本身无需 pip 包。
python3 -m venv .venv
.venv/bin/python -m pip install playwright
.venv/bin/python -m playwright install chromium
.venv/bin/python tests/browser_smoke.py
.venv/bin/python tests/ai_browser_test.py
```

Windows 使用 `.venv\Scripts\python` 替代 `.venv/bin/python`。也可设置 `CHROMIUM_PATH` 指向已安装的 Chrome 可执行文件。

## 文件结构

```text
index.html / app.js / styles.css   原前端及有限接入修改
hardware.css                      与原视觉保持一致的联动页样式
serial-protocol.js                有界分行、旧协议与遥测 v1 解析
serial-device.js                  只读串口、生命周期、显式演示
live-ui.js                       可视化、事件、记录与导出
serve.py / start.command / start.bat
firmware/original/               原程序备份
firmware/AIR_FLOW_Telemetry/      可选状态上报版
README.md                        启动、边界与排错
HARDWARE_PROTOCOL.md             队员继续开发的数据协议
TEST_REPORT.md                   本次测试范围
```

## 技术依据

本地输入：你上传的 `AIR-FLOW-Knee-frontend.zip` 与 `ZY_Knee_sketch(1).ino`。项目背景未被替换成新的医疗或商业定位。

Web Serial 和 UNO 的相关官方资料（查阅于 2026-09-05）：

```text
https://developer.chrome.com/docs/capabilities/serial
https://developer.mozilla.org/en-US/docs/Web/API/Navigator/serial
https://developer.mozilla.org/en-US/docs/Web/API/Serial/requestPort
https://developer.mozilla.org/en-US/docs/Web/API/SerialPort/close
https://store.arduino.cc/products/arduino-uno-rev3
```
