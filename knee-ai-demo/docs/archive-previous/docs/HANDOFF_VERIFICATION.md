# 本次 Codex 交接核查（2026-09-05）

> 接续开发更新（2026-09-05）：已在原页面实现 AI 观察区、本机代理、校验与会话历史；当前状态见 `README.md`、`TEST_REPORT.md`、`FIELD_DEMO.md`。真实 API 未配置/未验证，开发者无设备，真实 USB 未验证。下文保留交接时的历史基线。

[Unverified] 未连接实物 Arduino/传感器/气泵；没有模型凭证，未进行真实模型调用。此次是项目交接，不是 AI 功能交付或现场验收。

| 核查 | 本次结果 |
|---|---|
| 原 USB 包保留 | 30 个原文件均与原包逐字节一致 |
| JavaScript 语法 | app.js / live-ui.js / serial-device.js / serial-protocol.js 均通过 node --check |
| 协议测试 | 本次重跑 9/9 通过 |
| 主机固件替身测试 | 本次重跑 6/6 通过；非 AVR 编译与实板测试 |
| 浏览器检查 | 本次未重跑；原 TEST_REPORT.md 和 docs/test-output/ 是此前版本的历史记录 |
| 真实 USB / 物理执行 | 未验证 |
| AI 接口 / 真模型调用 | 基线尚无 AI 接入；这是下一轮开发任务 |

新增的文件仅提供开发上下文、规格和验收要求。没有改变运行时代码或固件，没有自动启动 Codex 任务，没有把代码提交到 GitHub。

完整命令输出与原文件 SHA-256 在 `HANDOFF_CHECKS.json`。旧 `docs/SHA256.json` 仅对应旧包，不能用它核验新增文件。

## 打开项目

在 Codex 中将解压后的本目录作为本地工作目录，读取并粘贴根目录 `CODEX_START_PROMPT.md` 的正文。不需要把整个聊天记录再次复制，也不要假定聊天中的示意图已经落实成代码。

现有代码启动：

```bash
python3 serve.py
```

浏览器入口：`http://localhost:8000/?view=hardware`。

当前启动不需要模型密钥；只有 Codex 实现模型代理后才按新的说明配置凭证。当前 serve.py 尚未私有文件加固，**此时不要把 .env 放入项目根目录**。

## 操作参考（官方资料查阅于 2026-09-05）

以下只说明产品使用方式，不构成本项目已在 Codex 中启动的证据：

- OpenAI Help Center：ChatGPT Work and Codex — `https://help.openai.com/en/articles/20001275`
- Codex / ChatGPT Learn：Custom instructions with AGENTS.md — `https://developers.openai.com/codex/guides/agents-md`

