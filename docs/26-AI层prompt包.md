# 26 · AI 层 Prompt 工程包（AIR-FLOW Knee+）

> 依据：`docs/00-情报库v2.md` §1 赛道AI门槛（评委三问②"把AI拿掉，产品是否失去关键能力"）、§2 合规红线；`docs/25-合成数据集设计.md`（字段命名/患者数据/安全状态机全部复用）。
> 用途：患者端打卡建议、训练中纠正提示、训练报告、医生端周报 digest 四个 LLM 能力模块。开发者按本文可直接实现。
> 红线（对 AI 输出强制执行）：①禁用词「诊断 / 治疗 / 处方 / 治愈」；②每份输出附免责声明字段；③红灯危机转介文案固定、由代码注入；④全部输入为合成数据。
> 落地位置建议：`web/src/lib/ai/`（`llmClient.ts` / `guard.ts` / `checkinCoach.ts` / `liveCue.ts` / `sessionReport.ts` / `doctorDigest.ts` / `fallbacks.ts`）。

---

## 0. 总则

### 0.1 为什么 AI 实质参与（评委三问②应答，直接可讲）

| 模块 | AI 带来的能力 | 去掉 AI 会失去什么 |
|---|---|---|
| ①打卡理解 | 把「疼痛3+肿胀0+完成率100%」织进一句有共情、有数字的个性化建议 | 退化为三档固定文案的打卡表单， nobody 会天天填 |
| ②训练中反馈 | 同一代偿信号对不同患者、不同时刻生成不同措辞，避免提示疲劳 | 6 句规则文案循环播放，第 3 次就被当成背景噪音 |
| ③训练报告 | 把 1800 点信号统计写成有叙事的进步故事（跨会话对比归纳） | 只剩一张数字表格，患者看不懂"我今天为什么变好了" |
| ④医生摘要 | 跨 7 天 × 3 类数据源（打卡+会话+报告）做模式识别与风险解释 | 医生被迫逐条翻原始数据——这正是产品要消灭的场景 |

一句话（路演口径）：**规则引擎负责"安全判定"，AI 负责"把判定翻译成人话并个性化"——安全不依赖 AI，体验离不开 AI。**

### 0.2 模型与参数总表

| 项 | 主力 | 备用 |
|---|---|---|
| 模型 | DeepSeek `deepseek-chat`（便宜、陆港直连） | OpenAI `gpt-4o-mini`（比赛 credits） |
| 接口 | 两者均 OpenAI-compatible，统一 `baseURL` 切换，一套客户端代码 | 同左 |
| JSON 模式 | `response_format: { type: "json_object" }`（两家都支持；prompt 中必须出现"JSON"字样——OpenAI 硬性要求） | 同左 |

| 模块 | temperature | top_p | max_tokens | 超时 | 重试 |
|---|---|---|---|---|---|
| ①打卡理解 | **0.3**（建议类，稳定优先） | 1 | 700 | 10s | 1次/退避300ms |
| ②实时纠正 | **0.7**（一句话要有多样性） | 0.9 | 100 | **2.5s**（训练中，宁缺毋滥） | 0次，直接走规则文案 |
| ③训练报告 | **0.5** | 1 | 800 | 12s | 1次 |
| ④医生摘要 | **0.3**（专业摘要，事实优先） | 1 | 900 | 15s | 1次 |

补充：DeepSeek 可传 `seed` 提升演示复现性（不保证跨版本一致）；正式兜底靠 `fallbacks.ts`，不靠 seed。

### 0.3 全局安全架构（三条铁律，代码层强制）

1. **安全判定全部由确定性规则产生，LLM 不参与判定。**
   - 模块①的红/黄/绿分级（`riskBand`）、模块②的状态机（SAFE/RISK/OVER）、模块④的 A/B/C 分级初值：均为代码计算（阈值见各模块"规则引擎"小节）。
   - LLM 收到 `ruleHint`，只负责"解释与个性化文案"；其输出中的 `riskBand/redFlag/riskLevel` 若与规则不一致，**以规则为准**并覆盖。
2. **禁用词双层防线。**
   - 第一层：所有 system prompt 中书面禁令（见各模块）。
   - 第二层：输出后置校验 `guard.ts` 正则扫描整个 JSON 字符串，命中 → **整包丢弃、走降级路径**、记录日志（见附A）。绝不"替换后放行"（替换可能改变语义）。
3. **免责声明与危机转介文案由代码注入。** 所有输出 schema 的 `disclaimer` 字段为 `const`，由 `llmClient.ts` 统一填充，不信任模型生成；红灯转介文案为常量 `CRISIS_TEXT`。

```ts
// llmClient.ts 核心封装（伪代码，可直接实现）
const DISCLAIMER = "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗";

async function runModule<T>(mod: ModuleDef, input: unknown, alignFn?: (o: T) => T): Promise<T> {
  if (process.env.AI_OFFLINE === "1") return mod.fallback(input);          // 手动离线开关
  for (let attempt = 0; attempt <= mod.retries; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: PROVIDER === "deepseek" ? "deepseek-chat" : "gpt-4o-mini",
        temperature: mod.temp, top_p: mod.topP, max_tokens: mod.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: mod.system },
          { role: "user", content: render(mod.userTpl, input) },
        ],
      }, { timeout: mod.timeoutMs });
      const obj = JSON.parse(res.choices[0].message.content!);
      assertSchema(obj, mod.outSchema);              // zod / ajv 校验，失败抛错
      guardForbiddenWords(JSON.stringify(obj));      // 命中即抛错（附A）
      const aligned = alignFn ? alignFn(obj) : obj;  // 规则覆盖：riskBand/riskLevel 以代码为准
      return { ...aligned, disclaimer: DISCLAIMER };
    } catch (e) {
      if (attempt === mod.retries) {
        reportFallbackUsed(mod.name, e);             // 上报埋点：路演前统计降级率
        return mod.fallback(input);
      }
      await sleep(300);
    }
  }
  throw new Error("unreachable");
}
// 连续 2 次 DeepSeek 5xx/超时 → PROVIDER 自动切 openai（环境变量 LLM_PROVIDER 覆写）
```

### 0.4 语言与展示约定

- 所有 user prompt 模板含 `"locale": "{{locale}}"`，默认 `zh-CN`；`en-US` 时模型输出英文（system prompt 已声明）。比赛演示固定 zh-CN。
- 免责声明组件固定出现在四端页脚 + AI 卡片底部（读 `disclaimer` 字段渲染）；页脚另固定「本演示全部使用合成数据，无真实患者数据」。
- AI 卡片统一带角标「AI 生成建议 · 非医疗建议」，降级时角标变为「基础建议模式」。

---

## 模块① 症状打卡理解（checkin-coach）

**触发时机**：患者端 `/patient` 提交每日打卡后（疼痛 0–10 / 肿胀 0–3 / 卡顿 0–3 / 打软 0–3 / 备注 + 昨日完成度）。
**AI 价值**：绿/黄/红由规则判定（0ms），AI 生成带患者数字的共情式今日建议，并输出结构化计划供「今日计划」卡片渲染。
**规则引擎（代码先行，先于 LLM 调用完成）**：

```
RED   = pain ≥ 7 ‖ swelling = 3 ‖ givingWay = 3 ‖ note 命中 /发烫|发热|剧痛|无法伸直|摔/
YELLOW= pain ≥ 5 ‖ swelling ≥ 2 ‖ catching ≥ 2 ‖ Δpain = +1 ‖ 昨日 completionPct < 60
GREEN = 其余
```

（校验：25号文档 P1 全周=GREEN；P2 d4 `pain5/swelling1/catching2` =YELLOW；P3 d4 `pain7/swelling3` =RED ✓）

### System Prompt（完整）

```
你是 AIR-FLOW Knee+ 的「今日训练教练」，居家膝关节康复用户的训练陪伴助手。你根据用户每日症状自评与历史完成情况，生成今日训练建议，帮助用户保持规律、安全的训练节奏。

【身份边界——必须遵守】
1. 你不是医护人员，不提供医疗建议。你只做训练陪伴与运动建议，不做任何医学判断。
2. 禁止出现以下词汇及其任何变体：「诊断」「治疗」「处方」「治愈」。同时禁止同义医学表述（如"你可能是半月板损伤""有炎症""需要手术""会痊愈"）。
3. 禁止解释疼痛的医学成因、禁止推测损伤部位与预后、禁止评价用户的就医决定。
4. 若输入 ruleHint.riskBand 为 RED：你的任务只有三件——肯定用户如实记录、建议今天暂停训练、引导其尽快就医。语气平稳，不渲染恐慌，不描述最坏情形。
5. 你引用的一切数字必须来自输入 JSON，禁止编造或推算输入中不存在的数据。

【表达要求】
- 中文为主；locale 为 en-US 时整包输出英文。
- 用"你"称呼用户，不用"患者"。语气：鼓励、具体、不评判。
- coachMessage 不超过两句；第一句共情或肯定（引用至少一个用户数据），第二句给出今日安排。
- 每条 caution 不超过 40 字，必须可执行。

【输出格式】
只输出一个合法 JSON 对象，不要 markdown 代码块、不要解释文字。riskBand 与 redFlag 必须与 ruleHint 完全一致（分级已由系统判定，你负责解释，不得改写）。riskBand 为 RED 时 referralText 原样使用输入中给出的固定文案。
```

### User Prompt 模板

```
【今日打卡】
{{CHECKIN_JSON}}
【规则引擎判定（系统已计算，你的事实基准）】
{{RULEHINT_JSON}}
【今日可选动作库（只能从中选择 focusActions.name）】
足跟滑动 / 靠墙静蹲 / 直腿抬高 / 股四头肌绷腿 / 台阶下行（进阶）
【任务】
按 system 约定生成今日训练建议 JSON。riskBand=GREEN → intensityAdj=maintain；YELLOW → reduce_20 或 reduce_40；RED → pause_today。
```

### 输入 JSON Schema

```json
{
  "type": "object",
  "required": ["day", "checkin", "yesterday", "weekTrend", "currentPlan", "locale"],
  "properties": {
    "day": { "type": "integer", "minimum": 1, "maximum": 7 },
    "checkin": {
      "type": "object",
      "required": ["pain", "swelling", "catching", "givingWay"],
      "properties": {
        "pain": { "type": "integer", "minimum": 0, "maximum": 10 },
        "swelling": { "type": "integer", "minimum": 0, "maximum": 3 },
        "catching": { "type": "integer", "minimum": 0, "maximum": 3 },
        "givingWay": { "type": "integer", "minimum": 0, "maximum": 3 },
        "note": { "type": "string", "maxLength": 100 }
      }
    },
    "yesterday": {
      "type": "object",
      "properties": {
        "pain": { "type": "integer" }, "swelling": { "type": "integer" },
        "catching": { "type": "integer" }, "givingWay": { "type": "integer" },
        "completionPct": { "type": "integer", "minimum": 0, "maximum": 100 }
      }
    },
    "weekTrend": {
      "type": "object",
      "properties": {
        "painFirst": { "type": "integer" }, "painNow": { "type": "integer" },
        "completionAvg": { "type": "integer" }, "redFlagDays": { "type": "integer" }
      }
    },
    "currentPlan": {
      "type": "object",
      "properties": {
        "actions": { "type": "array", "items": { "type": "string" } },
        "romTargetDeg": { "type": "integer", "minimum": 20, "maximum": 90 }
      }
    },
    "crisisText": { "type": "string", "description": "RED 时模型须原样引用的固定转介文案（代码注入）" },
    "locale": { "enum": ["zh-CN", "en-US"] }
  }
}
```

### 输出 JSON Schema

```json
{
  "type": "object",
  "required": ["riskBand", "redFlag", "intensityAdj", "coachMessage", "focusActions", "cautions", "referralText", "disclaimer"],
  "properties": {
    "riskBand": { "enum": ["GREEN", "YELLOW", "RED"] },
    "redFlag": { "type": "boolean" },
    "intensityAdj": { "enum": ["maintain", "reduce_20", "reduce_40", "pause_today"] },
    "coachMessage": { "type": "string", "maxLength": 120 },
    "focusActions": {
      "type": "array", "minItems": 1, "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["name", "detail"],
        "properties": {
          "name": { "type": "string" },
          "detail": { "type": "string", "description": "组数×次数/秒数，含幅度目标" },
          "note": { "type": "string", "maxLength": 40 }
        }
      }
    },
    "cautions": { "type": "array", "maxItems": 2, "items": { "type": "string" } },
    "referralText": { "type": "string", "description": "仅 RED 非空，内容=固定转介文案" },
    "disclaimer": { "type": "string", "const": "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗" }
  }
}
```

### Few-shot 示例

**Shot 1（GREEN · P1 Zhiyuan d7）**

user（关键部分）：
```json
{
  "day": 7,
  "checkin": { "pain": 3, "swelling": 0, "catching": 0, "givingWay": 0, "note": "膝盖感觉稳了" },
  "yesterday": { "pain": 3, "swelling": 0, "catching": 0, "givingWay": 0, "completionPct": 100 },
  "weekTrend": { "painFirst": 5, "painNow": 3, "completionAvg": 91, "redFlagDays": 0 },
  "currentPlan": { "actions": ["足跟滑动", "靠墙静蹲", "直腿抬高"], "romTargetDeg": 78 },
  "locale": "zh-CN"
}
```
assistant：
```json
{
  "riskBand": "GREEN",
  "redFlag": false,
  "intensityAdj": "maintain",
  "coachMessage": "第7天全勤，疼痛从5分稳稳降到3分——这就是坚持的样子。今天照旧三个动作，把幅度慢慢做到78°。",
  "focusActions": [
    { "name": "足跟滑动", "detail": "2组×10次，屈膝目标78°", "note": "3秒滑上去、3秒滑回来" },
    { "name": "靠墙静蹲", "detail": "2组×30秒", "note": "膝盖不超过脚尖" },
    { "name": "直腿抬高", "detail": "2组×10次", "note": "抬高约30°停5秒" }
  ],
  "cautions": ["训练后酸胀若比今天打卡高2分以上，明天回到今天的幅度"],
  "referralText": "",
  "disclaimer": "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗"
}
```

**Shot 2（RED 危机转介 · P3 淑芬 d4）**

user（关键部分）：
```json
{
  "day": 4,
  "checkin": { "pain": 7, "swelling": 3, "catching": 2, "givingWay": 2, "note": "膝盖又肿又烫，昨晚疼得没睡好" },
  "yesterday": { "pain": 6, "swelling": 2, "catching": 2, "givingWay": 2, "completionPct": 0 },
  "weekTrend": { "painFirst": 3, "painNow": 7, "completionAvg": 30, "redFlagDays": 1 },
  "currentPlan": { "actions": ["足跟滑动", "股四头肌绷腿"], "romTargetDeg": 40 },
  "crisisText": "检测到需要关注的信号：建议尽快就医，今天先暂停训练。",
  "locale": "zh-CN"
}
```
ruleHint（user prompt 中附带）：`{ "riskBand": "RED", "redFlag": true, "reasons": ["pain=7", "swelling=3", "note命中发热关键词"] }`

assistant：
```json
{
  "riskBand": "RED",
  "redFlag": true,
  "intensityAdj": "pause_today",
  "coachMessage": "谢谢你如实记录，肿胀和发热这个信号值得认真对待。今天先不训练，让膝盖休息，尽快去医院看一看。",
  "focusActions": [
    { "name": "今日暂停训练", "detail": "不做任何主动屈膝练习", "note": "避免长时间垂腿久坐" }
  ],
  "cautions": ["若发热加重或疼痛难以忍受，请立即前往急诊"],
  "referralText": "检测到需要关注的信号：建议尽快就医，今天先暂停训练。",
  "disclaimer": "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗"
}
```

### 降级方案（API 挂了显示什么）

`fallbacks.ts` 按规则引擎结果输出固定包；UI 角标显示「基础建议模式」，AI 卡片照常渲染（demo 不开天窗）：

| riskBand | 固定输出 |
|---|---|
| GREEN | intensityAdj=`maintain`；「今天的记录不错，按原计划来：足跟滑动2组×10次、靠墙静蹲2组×30秒、直腿抬高2组×10次。」+ 原动作库默认参数 |
| YELLOW | intensityAdj=`reduce_40`；「今天建议减量：只做足跟滑动和直腿抬高各1组，幅度减半，有任何不适就停。」 |
| RED | intensityAdj=`pause_today`；coachMessage=「今天先暂停训练。」；referralText=`CRISIS_TEXT`（固定）+ 免责声明。**降级路径同样触发医生端红点提醒（本地状态即可），危机转介不依赖 API** |

---

## 模块② 训练中实时反馈（规则 + AI 混合）

**架构（混合策略，关键工程决策）**：

```
信号流(10Hz) → 规则引擎(0ms, doc25 §④) ──触发──► ①立即显示规则固定文案（绝不等待网络）
                                   └─(异步)─► ②LLM 生成个性化一句话 → 2.5s 内返回则无缝替换卡片文案
```

- 规则触发器（复用 doc25 指标）：

| trigger | 检测条件 | 语义 |
|---|---|---|
| `PHASE_LAG` | sEMG 峰值滞后角度峰值 > 250ms | 相位延迟（肌肉发力跟不上动作） |
| `ASYMMETRY` | 左右不对称指数 > 15% | 左右不对称 |
| `AMPLITUDE_DECAY` | 当前周期幅度 < 参考幅度 85% | 幅度衰减（compIdx 主成分） |
| `FATIGUE_EARLY` | MDF 下降斜率 > 会话均值 1.5 倍 | 疲劳提前出现 |
| `PRESSURE_TREND` | 腔压基线斜率 > 0.04 kPa/s | 压力爬升趋势 |

- **防抖**：同类型触发 8s 内不重复调 LLM；`OVER` 状态**永不调 AI**——「停止加压、立即泄气、建议暂停」为固定安全文案，绝不因网络延迟。
- 替换规则：LLM 文案到达时若状态已变更（如 RISK→OVER），直接丢弃。

### System Prompt（完整）

```
你是 AIR-FLOW Knee+ 训练页的「实时纠正提示」生成器。规则引擎刚检测到一次代偿信号，你要把它翻译成患者看一眼就能照做的一句话。

铁律：
1. 只输出一个合法 JSON 对象，含 cue（一句话）与 toneTag，不要任何解释或 markdown。
2. cue 为 20–40 个汉字的一句话。
3. 语气鼓励、不评判：禁止出现「错误」「不对」「不要」「又」「还是不行」「警告」等否定与指责词；不描述失败，只描述下一步动作。
4. 用操作性指令（放慢 / 浅一点 / 停一下 / 休息一下 / 跟着节奏），可搭配一句肯定（很稳 / 保持 / 已经很好）。
5. 不提及任何医学结构名词（半月板、软骨、韧带、关节腔等），不解释成因，不预测后果。
6. 数字只能来自输入；不得要求患者做输入之外的新动作。
7. 中文为主；locale 为 en-US 时输出英文（15–25 词）。
```

### User Prompt 模板

```
【触发信号（规则引擎已判定）】
{{TRIGGER_JSON}}
【患者上下文】
{{CONTEXT_JSON}}
【上一条已显示的提示（避免重复措辞）】
"{{LAST_CUE}}"
【任务】
生成一句新的纠正提示 JSON。toneTag 从 encourage / slow_down / ease_range / rest 中选一个。
```

### 输入 JSON Schema

```json
{
  "type": "object",
  "required": ["trigger", "state", "sessionT", "metrics", "patientContext", "locale"],
  "properties": {
    "trigger": { "enum": ["PHASE_LAG", "ASYMMETRY", "AMPLITUDE_DECAY", "FATIGUE_EARLY", "PRESSURE_TREND"] },
    "state": { "enum": ["SAFE", "RISK"] },
    "sessionT": { "type": "integer", "description": "会话秒数" },
    "metrics": {
      "type": "object",
      "properties": {
        "romRefDeg": { "type": "number" }, "romNowDeg": { "type": "number" },
        "phaseLagMs": { "type": "integer" }, "asymPct": { "type": "integer" },
        "compIdx": { "type": "number", "minimum": 0, "maximum": 1 },
        "riskScore": { "type": "number", "minimum": 0, "maximum": 1 },
        "mdfHz": { "type": "number" }
      }
    },
    "patientContext": {
      "type": "object",
      "properties": {
        "dayStreak": { "type": "integer" },
        "romTargetDeg": { "type": "integer" },
        "completedReps": { "type": "integer" }
      }
    },
    "lastCue": { "type": "string" },
    "locale": { "enum": ["zh-CN", "en-US"] }
  }
}
```

### 输出 JSON Schema

```json
{
  "type": "object",
  "required": ["cue", "toneTag"],
  "properties": {
    "cue": { "type": "string", "minLength": 8, "maxLength": 60 },
    "toneTag": { "enum": ["encourage", "slow_down", "ease_range", "rest"] }
  }
}
```

### Few-shot 示例

**Shot 1（幅度衰减 · t≈62s 黄灯时刻，对应 90 秒闭环）**

user：
```json
{
  "trigger": "AMPLITUDE_DECAY", "state": "RISK", "sessionT": 62,
  "metrics": { "romRefDeg": 65, "romNowDeg": 51, "phaseLagMs": 180, "asymPct": 8, "compIdx": 0.42, "riskScore": 0.44, "mdfHz": 74 },
  "patientContext": { "dayStreak": 6, "romTargetDeg": 78, "completedReps": 18 },
  "lastCue": "节奏放慢一点，幅度先回到绿色区间",
  "locale": "zh-CN"
}
```
assistant：
```json
{ "cue": "6天的坚持看得到。幅度先浅一点，跟着两秒起、两秒落，稳稳的。", "toneTag": "ease_range" }
```

**Shot 2（相位延迟）**

user：
```json
{
  "trigger": "PHASE_LAG", "state": "RISK", "sessionT": 95,
  "metrics": { "romRefDeg": 60, "romNowDeg": 55, "phaseLagMs": 320, "asymPct": 11, "compIdx": 0.51, "riskScore": 0.48, "mdfHz": 71 },
  "patientContext": { "dayStreak": 6, "romTargetDeg": 78, "completedReps": 20 },
  "lastCue": "6天的坚持看得到。幅度先浅一点，跟着两秒起、两秒落，稳稳的。",
  "locale": "zh-CN"
}
```
assistant：
```json
{ "cue": "让肌肉先发力、动作再跟上，像听发令起跑一样，你做得到。", "toneTag": "encourage" }
```

### 降级方案（API 挂了/超时 2.5s 显示什么）

规则固定文案映射表（立即显示，永不低于此基线）：

| trigger | 固定文案 |
|---|---|
| `AMPLITUDE_DECAY` | 「做得不错，节奏放慢一点，幅度回到绿色区间再慢慢加深。」 |
| `PHASE_LAG` | 「跟着口令两秒起、两秒落，让肌肉和动作同步就很棒。」 |
| `ASYMMETRY` | 「留意两条腿的用力，别让好腿代劳，你已经很接近了。」 |
| `FATIGUE_EARLY` | 「今天肌肉累得快一些，把最后一组拆成两半完成也很好。」 |
| `PRESSURE_TREND` | 「支撑压力在爬升，先做浅一点，舒服更重要。」 |
| OVER（不调AI） | 「压力超限：已停止加压，正在立即泄气。建议暂停训练，稍作休息。」（doc25 §④ 原文，代码常量） |

---

## 模块③ 训练报告生成（session-report）

**触发时机**：会话结束（doc25 t=178s 收尾）或用户点击「生成报告」。
**AI 价值**：把会话统计 JSON 写成有叙事的进步故事，进步点强制跨会话对比引用。

### System Prompt（完整）

```
你是 AIR-FLOW Knee+ 的「训练报告撰写员」，为刚完成一次居家膝关节康复训练的用户生成结构化报告。

【身份边界——必须遵守】
1. 你不是医护人员，不提供医疗建议；本报告是训练数据的整理与鼓励，不是任何医学结论。
2. 禁止出现「诊断」「治疗」「处方」「治愈」及同义医学表述；禁止推测损伤与预后；禁止使用"关节腔""半月板"等结构名词做因果解释（可引用输入里的指标名原文）。
3. 你引用的一切数字必须来自输入 JSON（含 prevSession 对比字段），禁止编造或心算出新数值。

【内容规则】
- summary 恰好 3 句：完成情况 → 幅度/负荷表现 → 特殊事件（保护触发/中断恢复；无则写整体节奏）。
- progress 恰好 2 条：每条必须引用一个与 prevSession 的对比（数字或方向），禁止无依据的夸奖。
- nextTips 恰好 2 条：具体可执行（幅度/组数/节奏/休息安排），与本次数据呼应。
- riskNote 恰好 1 条：若有 overEvents/riskEvents 用数据描述并给下次建议；没有则写"本次无保护触发，注意保持节奏"级别的提醒，不许渲染风险。
- 语气：肯定、具体、不评判；每条不超过 50 字。
- 中文为主；locale 为 en-US 时整包输出英文。

【输出格式】
只输出一个合法 JSON 对象，不要 markdown、不要解释。
```

### User Prompt 模板

```
【本次会话统计】
{{SESSION_JSON}}
【上一次会话（用于对比）】
{{PREV_JSON}}
【今日打卡】
{{CHECKIN_JSON}}
【任务】
按 system 约定生成训练报告 JSON（summary 3 句 / progress 2 条 / nextTips 2 条 / riskNote 1 条）。
```

### 输入 JSON Schema

```json
{
  "type": "object",
  "required": ["sessionId", "durationSec", "stats", "prevSession", "checkinToday", "locale"],
  "properties": {
    "patientAlias": { "type": "string" },
    "sessionId": { "type": "string" },
    "date": { "type": "string" },
    "durationSec": { "type": "integer" },
    "stats": {
      "type": "object",
      "required": ["repsCompleted", "completionPct", "romAvgDeg", "pressurePeakKPa", "fatigueOnsetSec", "riskEvents", "overEvents"],
      "properties": {
        "repsPlanned": { "type": "integer" }, "repsCompleted": { "type": "integer" },
        "completionPct": { "type": "integer" },
        "romAvgDeg": { "type": "number" }, "romPeakDeg": { "type": "number" }, "romTargetDeg": { "type": "number" },
        "pressurePeakKPa": { "type": "number" }, "pressureAvgKPa": { "type": "number" },
        "fatigueFactorEnd": { "type": "number" }, "fatigueOnsetSec": { "type": "integer" },
        "riskEvents": { "type": "integer" }, "overEvents": { "type": "integer" },
        "pauseSec": { "type": "integer" }, "resumed": { "type": "boolean" },
        "compIdxAvg": { "type": "number" }, "compIdxPeak": { "type": "number" }
      }
    },
    "painBefore": { "type": "integer", "minimum": 0, "maximum": 10 },
    "painAfter": { "type": "integer", "minimum": 0, "maximum": 10 },
    "prevSession": {
      "type": "object",
      "properties": {
        "romAvgDeg": { "type": "number" }, "fatigueOnsetSec": { "type": "integer" },
        "overEvents": { "type": "integer" }, "completionPct": { "type": "integer" }
      }
    },
    "checkinToday": {
      "type": "object",
      "properties": {
        "pain": { "type": "integer" }, "swelling": { "type": "integer" },
        "catching": { "type": "integer" }, "givingWay": { "type": "integer" }
      }
    },
    "locale": { "enum": ["zh-CN", "en-US"] }
  }
}
```

### 输出 JSON Schema

```json
{
  "type": "object",
  "required": ["summary", "progress", "nextTips", "riskNote", "disclaimer"],
  "properties": {
    "summary": { "type": "array", "minItems": 3, "maxItems": 3, "items": { "type": "string", "maxLength": 60 } },
    "progress": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "string", "maxLength": 60 } },
    "nextTips": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "string", "maxLength": 60 } },
    "riskNote": { "type": "array", "minItems": 1, "maxItems": 1, "items": { "type": "string", "maxLength": 60 } },
    "overEventFlag": { "type": "boolean", "description": "本次是否触发超限保护，供 UI 高亮；与输入 stats.overEvents>0 对齐" },
    "disclaimer": { "type": "string", "const": "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗" }
  }
}
```

### Few-shot 示例

**Shot 1（含超限保护与恢复的会话 · P2）**

user（关键部分）：
```json
{
  "sessionId": "demo-90s-v3", "durationSec": 180,
  "stats": {
    "repsPlanned": 28, "repsCompleted": 26, "completionPct": 93,
    "romAvgDeg": 49, "romPeakDeg": 65, "romTargetDeg": 65,
    "pressurePeakKPa": 22.4, "pressureAvgKPa": 12.1,
    "fatigueFactorEnd": 0.55, "fatigueOnsetSec": 48,
    "riskEvents": 1, "overEvents": 1, "pauseSec": 16, "resumed": true,
    "compIdxAvg": 0.31, "compIdxPeak": 0.52
  },
  "painBefore": 4, "painAfter": 4,
  "prevSession": { "romAvgDeg": 55, "fatigueOnsetSec": 40, "overEvents": 0, "completionPct": 88 },
  "checkinToday": { "pain": 4, "swelling": 0, "catching": 1, "givingWay": 0 },
  "locale": "zh-CN"
}
```
assistant：
```json
{
  "summary": [
    "本次完成26/28次，完成率93%，中途中断16秒后顺利恢复。",
    "屈膝平均幅度49°、峰值65°，比上次的55°浅了一些。",
    "腔压峰值22.4kPa触发1次自动泄气保护，系统即时介入。"
  ],
  "progress": [
    "疲劳出现时间从40秒推迟到48秒，耐力在慢慢积累。",
    "中断后主动恢复训练，完成率93%还比上次高5个百分点。"
  ],
  "nextTips": [
    "下次幅度目标下调到55°，先找回无中断的完整一组。",
    "把最后一组拆成两个半组，组间休息30秒。"
  ],
  "riskNote": [
    "本次出现1次压力保护，下次从更低幅度起步，若再次触发请当天停止加练。"
  ],
  "overEventFlag": true,
  "disclaimer": "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗"
}
```

**Shot 2（无事件平稳会话，输出要点）**：`summary[2]` 改写为「全程节奏平稳，无中断、无保护触发」；`riskNote` 为「本次无保护触发，继续保持现在的节奏，别在疲劳时追幅度」。（完整 JSON 略，结构同上。）

### 降级方案（API 挂了显示什么）

模板字符串填充（`fallbacks.ts`，纯函数）：

```
summary = [
  "本次完成 {repsCompleted}/{repsPlanned} 次，完成率 {completionPct}%。",
  "屈膝平均幅度 {romAvgDeg}°，峰值 {romPeakDeg}°，目标 {romTargetDeg}°。",
  overEvents>0 ? "本次触发 {overEvents} 次自动泄气保护，系统即时介入。" : "全程节奏平稳，无保护触发。"
]
progress = [ "疲劳出现时间 {prev.fatigueOnsetSec}→{fatigueOnsetSec} 秒。", "完成率 {prev.completionPct}%→{completionPct}%。" ]
nextTips = overEvents>0
  ? ["下次幅度目标下调 {romTargetDeg-10}°。", "组间休息30秒，完成质量优先。"]
  : ["下次尝试幅度 +5°。", "保持当前节奏与组数。"]
riskNote = overEvents>0 ? ["出现压力保护，下次从更低幅度起步。"] : ["本次无保护触发，注意别在疲劳时追幅度。"]
```

UI 显示「基础报告 · 由模板生成」，图章区别于 AI 版。

---

## 模块④ 医生端 AI 摘要（doctor-digest）

**触发时机**：医生端 `/doctor` 打开患者详情页（或每 24h 批量预生成）。
**AI 价值（产品核心卖点）**：跨 7 天打卡 + 会话统计 + 报告三类数据源做趋势归纳、疲劳代偿模式识别、风险分级解释与计划调整建议——**医生不逐条看原始数据，只看这个**。
**规则引擎（代码先行）**：

```
C（关注）= 近7天 redFlagDays ≥ 1 ‖ givingWay ≥ 2 连续 ≥ 2 天 ‖ completionAvg < 50%
B（观察）= pain 7日内极差 ≥ 2 ‖ riskSessionCount ≥ 2 ‖ completionAvg 50–85%
A（稳定）= 其余
```

（校验：P1 → A；P2 `pain极差2 + riskSession≥2` → B；P3 `redFlagDays=1` → C ✓）

### System Prompt（完整）

```
你是 AIR-FLOW Knee+ 医生端的「AI 周报摘要员」，为随访医生把一位患者近 7 天的打卡、训练会话与报告数据压缩成一段可快速阅读的 digest。医生不逐条看原始数据，只看你的输出，所以信息密度和忠实度是生命线。

【身份边界——必须遵守】
1. 你只描述数据趋势与训练行为，不做任何医学判断：禁止出现「诊断」「治疗」「处方」「治愈」，禁止推测病情、疗效、预后，禁止建议用药或就医方式（就医引导由系统在红灯场景另行处理）。
2. 你引用的一切数字必须来自输入 JSON，禁止编造、心算或外推输入中不存在的数值。
3. 模式识别只允许描述"训练行为模式"（如疲劳出现时间前移、幅度下降伴随压力指标上升、以减幅换取完成率），不得命名为任何综合征或病症。
4. riskLevel 必须与输入 ruleHint.riskLevel 一致（分级已由系统判定，你负责给出理由）。
5. planSuggestions 用「训练计划/运动建议」语言：幅度、组数、频率、组间休息、终止条件。恰好 2 条，每条不超过 50 字，可被医生一键采纳下发。

【表达要求】
- 面向专业读者：简洁、克制、量化；不用感叹号，不用鼓励性修辞。
- trend 不超过 80 字；pattern 不超过 80 字；riskReason 不超过 60 字。
- 中文为主；locale 为 en-US 时整包输出英文。

【输出格式】
只输出一个合法 JSON 对象，不要 markdown、不要解释。
```

### User Prompt 模板

```
【患者 7 天打卡序列】
{{CHECKINS_JSON}}
【7 天会话聚合统计】
{{SESSIONS_JSON}}
【本周报告要点（已生成的 AI 报告摘录）】
{{REPORTS_DIGEST_JSON}}
【规则引擎分级（系统已计算）】
{{RULEHINT_JSON}}
【任务】
按 system 约定生成医生端周报 digest JSON。
```

### 输入 JSON Schema

```json
{
  "type": "object",
  "required": ["patientAlias", "range", "checkins", "sessions", "ruleHint", "locale"],
  "properties": {
    "patientAlias": { "type": "string" },
    "range": { "type": "object", "properties": { "from": { "type": "string" }, "to": { "type": "string" } } },
    "checkins": {
      "type": "array", "maxItems": 7,
      "items": {
        "type": "object",
        "properties": {
          "day": { "type": "integer" },
          "pain": { "type": "integer" }, "swelling": { "type": "integer" },
          "catching": { "type": "integer" }, "givingWay": { "type": "integer" },
          "completionPct": { "type": "integer" },
          "note": { "type": "string" }
        }
      }
    },
    "sessions": {
      "type": "object",
      "properties": {
        "count": { "type": "integer" },
        "completionAvgPct": { "type": "integer" },
        "romAvgDeg": { "type": "number" }, "romTrendDeg": { "type": "number" },
        "fatigueOnsetAvgSec": { "type": "integer" }, "fatigueOnsetTrendSec": { "type": "integer" },
        "overEventsTotal": { "type": "integer" },
        "riskSessionCount": { "type": "integer" },
        "compIdxAvg": { "type": "number" }
      }
    },
    "reportsDigest": {
      "type": "array",
      "items": { "type": "object", "properties": { "date": { "type": "string" }, "riskNote": { "type": "string" }, "overEventFlag": { "type": "boolean" } } }
    },
    "ruleHint": {
      "type": "object",
      "required": ["riskLevel", "reasons"],
      "properties": {
        "riskLevel": { "enum": ["A", "B", "C"] },
        "reasons": { "type": "array", "items": { "type": "string" } }
      }
    },
    "locale": { "enum": ["zh-CN", "en-US"] }
  }
}
```

### 输出 JSON Schema

```json
{
  "type": "object",
  "required": ["trend", "pattern", "riskLevel", "riskReason", "planSuggestions", "disclaimer"],
  "properties": {
    "trend": { "type": "string", "maxLength": 100, "description": "变化趋势：疼痛/肿胀/完成率/幅度的方向与关键数字" },
    "pattern": { "type": "string", "maxLength": 100, "description": "疲劳代偿模式识别：训练行为模式描述" },
    "riskLevel": { "enum": ["A", "B", "C"] },
    "riskReason": { "type": "string", "maxLength": 80 },
    "planSuggestions": {
      "type": "array", "minItems": 2, "maxItems": 2,
      "items": { "type": "string", "maxLength": 60 }
    },
    "redFlagDays": { "type": "integer", "description": "本周红灯天数回显，供医生端红点" },
    "disclaimer": { "type": "string", "const": "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗" }
  }
}
```

### Few-shot 示例

**Shot 1（B 级 · P2 国豪，代偿型主角）**

user（关键部分）：
```json
{
  "patientAlias": "P2",
  "range": { "from": "2026-08-30", "to": "2026-09-05" },
  "checkins": [
    { "day": 1, "pain": 4, "swelling": 0, "catching": 1, "givingWay": 0, "completionPct": 100 },
    { "day": 2, "pain": 3, "swelling": 1, "catching": 1, "givingWay": 0, "completionPct": 75 },
    { "day": 3, "pain": 4, "swelling": 1, "catching": 2, "givingWay": 1, "completionPct": 80 },
    { "day": 4, "pain": 5, "swelling": 1, "catching": 2, "givingWay": 1, "completionPct": 60 },
    { "day": 5, "pain": 4, "swelling": 0, "catching": 1, "givingWay": 0, "completionPct": 85 },
    { "day": 6, "pain": 3, "swelling": 0, "catching": 1, "givingWay": 0, "completionPct": 90 },
    { "day": 7, "pain": 3, "swelling": 0, "catching": 0, "givingWay": 0, "completionPct": 95 }
  ],
  "sessions": { "count": 6, "completionAvgPct": 84, "romAvgDeg": 52, "romTrendDeg": -6, "fatigueOnsetAvgSec": 55, "fatigueOnsetTrendSec": -10, "overEventsTotal": 1, "riskSessionCount": 3, "compIdxAvg": 0.38 },
  "reportsDigest": [
    { "date": "09-03", "riskNote": "出现1次压力保护", "overEventFlag": true },
    { "date": "09-04", "riskNote": "代偿趋势持续，系统已下调建议幅度", "overEventFlag": false }
  ],
  "ruleHint": { "riskLevel": "B", "reasons": ["近3次会话中3次出现代偿趋势", "d3–d4疼痛回升+2", "完成率84%中等"] },
  "locale": "zh-CN"
}
```
assistant：
```json
{
  "trend": "疼痛自评4→3整体下行，d3–d4一度回升至5；完成率均值84%，d4低至60%后回升至95%。",
  "pattern": "连续会话在60–75秒出现幅度下降伴疲劳指标偏高，倾向「以减小幅度换取完成」的耐力型代偿；幅度趋势-6°。",
  "riskLevel": "B",
  "riskReason": "疼痛波动叠加代偿趋势反复，但无红灯信号、打软腿未加重，属观察级。",
  "planSuggestions": [
    "维持减量计划3天：屈膝目标55°、组数-1，疲劳出现恢复至60秒以上再回升幅度。",
    "第3组起加30秒组间休息，并把打软腿自评列入每日打卡关注项。"
  ],
  "redFlagDays": 0,
  "disclaimer": "本产品为康复训练辅助软件，非医疗器械，不提供医疗建议，不能替代专业诊疗"
}
```

**Shot 2（C 级 · P3 淑芬，红灯周）要点**：`trend` 首句必须出现「d4 打卡触发红灯信号（疼痛7+肿胀3），系统已提示尽快就医」；`riskLevel=C`；`planSuggestions` 第 1 条为「维持保守幅度40°，暂停进阶动作，待连续3天无红灯再评估」。规则理由：`redFlagDays=1`。

### 降级方案（API 挂了显示什么）

规则分级 + 模板 digest（`fallbacks.ts`），医生端仍可用（闭环比颜值优先）：

```
riskLevel = 规则引擎计算（同上表，代码权威）
trend    = "近7天完成率{completionAvgPct}%，疼痛{painFirst}→{painLast}；红灯{redFlagDays}天。"
pattern  = riskSessionCount≥2
  ? "{riskSessionCount}次会话出现幅度下降伴疲劳指标偏高，建议关注代偿趋势。"
  : "未捕捉到持续的代偿模式。"
riskReason = ruleHint.reasons[0]（直接用规则理由）
planSuggestions = {
  A: ["维持当前计划。", "下次随访复核幅度目标。"],
  B: ["减量3天：幅度-10°、组数-1。", "复查代偿趋势后再回升强度。"],
  C: ["维持保守幅度，暂停进阶动作。", "确认红灯当日情况后再评估计划。"]
}[riskLevel]
```

UI 显示「基础摘要 · 规则生成」，风险分级徽标颜色不变（分级来自代码，永不因 API 失联而失真）。

---

## 附A 禁用词校验（guard.ts）

```ts
// 官方红线四词 + 常见变体（扩充只从严、不从宽）
export const FORBIDDEN_RE =
  /(诊斷|诊断|治療|治疗|治癒|治愈|痊愈|處方|处方|药方|開刀|开刀|手术|根治|包治|疗效)/;

export function guardForbiddenWords(text: string): void {
  if (FORBIDDEN_RE.test(text)) {
    logViolation(text.match(FORBIDDEN_RE)![0]);   // 埋点：路演前检查降级率与高频命中词
    throw new Error("FORBIDDEN_WORD");            // runModule 捕获 → 走 fallback
  }
}
```

- 校验对象：`JSON.stringify(输出对象)` 全文（含 key 之外的所有字符串值）。
- 讲稿/演示口径参考替换：治疗计划→**训练计划**；治疗方案→**运动建议**；临床治愈→（不出现）。
- 每次迭代 prompt 后跑一遍「四患者×全路径回归」：`pnpm test:ai`（快照所有模块输出 + 禁用词断言），红线问题在提交前暴露。

## 附B 路演可靠性清单（现场 90 秒闭环不挂）

1. **预热缓存**：开场前对 `sessionId="demo-90s"` 依次调用模块①②③④，成功输出写入 `localStorage`（key 含 provider+prompt 版本号）；现场命中缓存则 0 延迟、0 风险，缓存未命中才真实调用。
2. **离线开关**：`AI_OFFLINE=1` 一键全链路走降级——demo 完整可演，只是角标变「基础模式」。现场 Wi-Fi 崩了照样走完闭环。
3. **双通道**：DeepSeek 连续 2 次失败自动切 OpenAI credits；两者都挂才降级。
4. **超时即降**：模块② 2.5s 前不到直接显示规则文案——训练页节奏永不被网络拖住。
5. 评委说"再跑一次"：换 `sessionId="demo-90s-v2"`，行为模式一致、文案细节不同（25号文档 §⑤ 种子策略）。

## 附C 环境变量（.env.local）

```bash
LLM_PROVIDER=deepseek            # deepseek | openai
DEEPSEEK_API_KEY=sk-...          # https://api.deepseek.com（OpenAI-compatible）
OPENAI_API_KEY=sk-...            # 比赛 credits，备用通道
LLM_TIMEOUT_MS=10000             # 模块②内部覆写为 2500
AI_OFFLINE=0                     # 1 = 全链路降级模式（现场保命开关）
AI_CACHE_VERSION=v1              # 预热缓存 key 版本，改 prompt 后 +1
```

---

## 交付自查（对回情报库 §1/§2）

| 门槛 | 本包落实 |
|---|---|
| AI实质参与（三问②） | §0.1 逐模块"去掉AI失去什么"应答；4 个模块均为"生成/推荐/理解"级能力，非聊天框 |
| 合规可见（免责+危机转介） | 所有输出 schema 强制 `disclaimer`（代码注入 const）；模块① RED 固定转介文案，降级路径同样触发 |
| 禁用词 | 双层防线：prompt 禁令 + `guard.ts` 正则整包校验，命中即降级（附A） |
| 数据边界 | 输入全部来自 `web/src/lib/synth/` 合成数据；页脚合成数据标注（25号文档） |
| 可运行 | 每模块含完整 prompt/schema/few-shot/降级 + `runModule` 封装伪代码，可直接实现 |
