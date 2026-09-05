# 膝望：当前电脑上的共享会话

本轮在现有轻量前端与唯一 `AirflowLive.device` 上增加了共享记录。没有第二个串口实例，没有设备控制路径，也没有跨电脑或跨标签页同步。

## 页面流程

用户端「日常行动」→「记录今天这一次」→连接 USB 或显式开启合成演示→「开始记录」→人工标注暂停或主动结束→配置并授权后分析本会话→切换专业端→「已查看这份记录」或「需要补充记录」→回到用户端查看同一份反馈。

录制任务来自团队演示脚本，人物志远为明确标注的演示人物。原健康分值、支撑百分比、多人名单及概念训练参数已移出当前主路径。

## 数据接口

`session-store.js` 建立 `window.AirflowSessions`（`SessionStore` 实例）。

- `active`：当前正在采集的会话；`current`：当前选中会话，可为已结束记录。
- `start(snapshot, context)`、`finish(reason)` 管理网页记录，返回同一记录对象。
- `addSample(point, generation)` 接收现有串口的 sample 事件。来源、协议与连接代次必须匹配。遥测重复 seq 去重；旧协议每行均保留，包括同一毫秒内到达的多行。
- `addCamera(detail)` 接收 `airflow:camera-observation`。摄像头/录像与肌电来源独立保存，缺失角度保持 null；保留左侧/右侧/未知侧别，固定二维投影屈曲角、度的语义，冲突单位直接拒绝；当前会话开始前的迟到观察被丢弃。
- `addManualEvent(type)` 只接受 `manual_end`、`manual_pause`、`review_requested`，来源固定 `manual`。
- `attachAI(entry)` 按 `entry.input.sessionId`、来源及连接代次严格绑定。原 observer 的 pending 对象保留引用，其 completed/discarded 通知通过 `airflow:ai-history` 更新版本。AI 历史独立于实测 samples。
- `review(id, status, note)` 仅接受 `reviewed` 或 `needs_more`，由专业端明确点击产生；保存复核时间、备注及内容版本。复核后有新内容时提示待再次复核。专业备注草稿按 sessionId 隔离，切换会话加载该会话草稿或已保存备注，同一会话定时刷新不覆盖正在输入的文字。
- `export(id)` 导出完整会话的独立 JSON 副本；`select(id)` 选择回看，不改变正在采集的会话。

记录包括 `schemaVersion`、`sessionId/id`、`version/contentVersion`、`startedAt/endedAt`、`source/sources`、`generation/protocol`、`samples`、`cameraObservations`、`events`、`aiHistory`、`review/reviewHistory`。所有测量缺项保留 null；实际压力、辅助力、泵状态均仍为未验证。

界面中的事件有 `data-event-id`。AI 发出的 `airflow:focus-event` 携带 `sessionId/eventId`，页面定位并突出显示对应事件。

## 保留范围

完整会话仅保存在当前页面内存，最多 40 条，每次肌电与角度观察各最多 10000 条。刷新前导出完整 JSON。原摘要存储键保留用于兼容旧导出，不包含波形、AI 明细或专业复核，也不当作当前共享记录读取。模型授权、媒体与采样明细不写入 localStorage。

## 软件验证

`node --test tests/session-store.test.cjs tests/session-integration.test.cjs`：11 个共享数据单测、4 个实际串口模块/记录桥接集成测试；另有 `tests/roadshow-review.test.cjs` 的 2 个备注草稿隔离界面逻辑测试。均使用显式合成输入，没有连接 USB、摄像头或真实模型。

覆盖：同机同一记录、显式复核、复核后新内容、来源隔离、同毫秒唯一会话、遥测重复 seq、旧协议同毫秒多行、摄像头/回放来源与 null 角度、人工主动结束、精确会话 AI 归属、断连隐藏、旧样本新状态帧、JSON 来源保留。

浏览器主流程、三轮彩排、实物 USB、真实模型与物理响应需要分别报告，不能从这些测试推导已经通过。
