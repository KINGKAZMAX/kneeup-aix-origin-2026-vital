/* Shared record / professional review UI. No fabricated patients or automatic review actions. */
(function () {
  'use strict';
  const sessions=window.AirflowSessions;
  const reviewDrafts=new Map();
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stamp=t=>new Date(t).toLocaleString('zh-CN',{hour12:false});
  const source=s=>({serial:'USB 串口输入',simulated:'合成输入 · 非实测',camera:'摄像头观察 · 二维估计',replay:'录像回放 · 非实时',manual:'人工标注',system:'网页记录事件'})[s]||'未测得';
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  function sessionPanel({professional=false,compact=false}={}) {
    return `<section class="card shared-session" id="sharedSession" data-professional="${professional}">
      <div class="usb-card-head"><div><div class="eyebrow">ONE SESSION / SHARED EVIDENCE</div><h2>${professional?'下一次沟通有什么依据？':'我的记录与专业反馈'}</h2></div><span class="chip" id="sharedReviewBadge">尚无会话</span></div>
      <p class="usb-caption">${professional?'当前切换的是同一台电脑上的专业角色。复核状态由下方明确操作产生。':'用户端与专业端查看当前电脑里的同一份记录。'} 完整数据仅保留在本页内存，刷新前请导出。</p>
      <div class="shared-empty" id="sharedEmpty"><h3>还没有行动记录</h3><p>连接输入后，开始并结束一次网页记录。</p><button class="btn cobalt" data-nav="hardware">开始记录 →</button></div>
      <div id="sharedContent" hidden><div class="shared-session-top"><div><b id="sharedSessionId"></b><p class="usb-caption" id="sharedSessionTime"></p></div><label class="session-selector-label">查看会话 <select id="selectSharedSession" aria-label="选择会话"></select></label></div>
      <p class="session-note" id="sharedSources"></p><div class="shared-counts"><div><b id="sharedSamples">0</b><span>肌电采样点</span></div><div><b id="sharedCamera">0</b><span>视觉观察记录（含缺失）</span></div><div><b id="sharedEvents">0</b><span>时间线事件</span></div></div>
      <div class="shared-feedback" aria-live="polite"><b id="sharedReviewTitle">等待专业复核</b><p id="sharedReviewNote"></p><small id="sharedReviewTime"></small></div>
      ${professional?'<div class="professional-actions"><label for="professionalNote">复核备注（仅保存在本页记录，不发给模型）</label><textarea id="professionalNote" rows="2" maxlength="500" placeholder="例如：请补充摄像头来源说明。"></textarea><div class="usb-actions"><button class="btn cobalt" id="reviewSharedSession">已查看这份记录</button><button class="btn" id="requestMoreRecord">需要补充记录</button><button class="btn ghost" data-role-nav="patient">回到用户端查看结果 →</button></div><p class="usb-caption">此操作确认记录已被查看，不代表临床结论或设备验收。</p></div>':''}
      ${compact?'<div class="usb-actions"><button class="btn" data-nav="records">打开完整记录 →</button><button class="btn ghost" data-role-nav="therapist">专业端复核 →</button></div>':`<div class="shared-evidence-grid"><div><h3>刚才发生了什么？</h3><div id="sharedTimeline" class="shared-timeline" aria-label="共享会话时间线"></div></div><div><h3>AI 能解释什么？</h3><div id="sharedAIHistory" class="shared-ai-history"></div></div></div>
      <details class="shared-raw"><summary>查看已记录的来源与测量字段</summary><pre id="sharedRaw"></pre></details>
      <div class="usb-actions"><button class="btn" id="exportSharedSession">导出这份完整会话 JSON</button>${professional?'':'<button class="btn cobalt" data-role-nav="therapist">打开同机专业复核 →</button>'}</div>`}
      </div></section>`;
  }
  function professional() {
    return `<div class="page-title"><div><div class="eyebrow">PROFESSIONAL / REVIEW TOGETHER</div><h1>把记录带入下一次沟通。</h1><p class="lead usb-intro">查看实际采集、人工标注和 AI 依据，再留下明确反馈。</p></div><span class="chip">同机专业角色 · 非跨设备同步</span></div>${sessionPanel({professional:true})}`;
  }
  function records() {
    return `<div class="page-title"><div><div class="eyebrow">MY RECORDS / THIS BROWSER</div><h1>每次记录，都能回看依据。</h1></div><button class="btn" data-nav="hardware">开始新记录 →</button></div>${sessionPanel({professional:window.AirflowApp?.state.role==='therapist'})}`;
  }
  function reviewLabel(r) {
    if (!r) return '尚无会话';
    if (r.review.status!=='pending' && sessions.needsReview(r)) return '已有新内容 · 待再次复核';
    return {pending:'等待专业复核',reviewed:'专业端已查看',needs_more:'专业端需要补充记录'}[r.review.status];
  }
  function refresh() {
    if (!document.getElementById('sharedSession')) return;
    const r=sessions.current, empty=document.getElementById('sharedEmpty'), body=document.getElementById('sharedContent');
    empty.hidden=Boolean(r); body.hidden=!r; set('sharedReviewBadge',reviewLabel(r)); if(!r)return;
    const note=document.getElementById('professionalNote');
    if(note && note.dataset.sessionId!==r.id){
      if(note.dataset.sessionId)reviewDrafts.set(note.dataset.sessionId,note.value);
      note.value=reviewDrafts.has(r.id)?reviewDrafts.get(r.id):r.review.note;
      note.dataset.sessionId=r.id;
    }
    set('sharedSessionId',r.sessionId); set('sharedSessionTime',`${stamp(r.startedAt)} · ${r.endedAt?'已结束：'+r.reason:'正在记录'} · 版本 ${r.version}`);
    set('sharedSources',`本次来源：${r.sources.map(source).join('；')}。压力、实际辅助力与泵状态：未测得。`);
    set('sharedSamples',r.samples.length);set('sharedCamera',r.cameraObservations.length);set('sharedEvents',r.events.length);
    set('sharedReviewTitle',reviewLabel(r));set('sharedReviewNote',r.review.note||'暂无专业备注。');set('sharedReviewTime',r.review.reviewedAt?`${stamp(r.review.reviewedAt)} · 专业端明确点击确认；复核内容版本 ${r.review.contentVersion}`:'复核前不会自动生成“已查看”状态。');
    const selector=document.getElementById('selectSharedSession'); const selectKey=sessions.list().map(x=>x.id).join('|')+'|'+r.id;
    if(selector.dataset.key!==selectKey){selector.innerHTML=sessions.list().map(x=>`<option value="${esc(x.id)}" ${x.id===r.id?'selected':''}>${esc(stamp(x.startedAt))} · ${esc(source(x.source))}</option>`).join('');selector.dataset.key=selectKey;}
    const timeline=document.getElementById('sharedTimeline');
    if(timeline && timeline.dataset.key!==r.id+':'+r.events.length){
      const wasExpanded=timeline.dataset.sessionId===r.id && Boolean(document.getElementById('sharedOlderEvents')?.open);
      const events=r.events.slice().reverse();
      const eventHTML=e=>`<article class="shared-event" tabindex="-1" data-event-id="${esc(e.eventId)}"><div><time>${esc(stamp(e.capturedAt))}</time><span class="source-label">${esc(source(e.source))}</span></div><b>${esc(e.text)}</b><small>${esc(e.eventId)}</small></article>`;
      timeline.innerHTML=events.slice(0,8).map(eventHTML).join('')+(events.length>8?`<details id="sharedOlderEvents" class="shared-older-events" ${wasExpanded?'open':''}><summary>展开更早的 ${events.length-8} 条事件 · 完整记录</summary>${events.slice(8).map(eventHTML).join('')}</details>`:'');
      timeline.dataset.key=r.id+':'+r.events.length;timeline.dataset.sessionId=r.id;
    }
    const ai=document.getElementById('sharedAIHistory');
    const aiKey=r.id+JSON.stringify(r.aiHistory.map(e=>[e.input.requestId,e.status,e.mode,e.completedAt]));
    if(ai && ai.dataset.key!==aiKey){ai.innerHTML=r.aiHistory.length?r.aiHistory.slice().reverse().map(e=>{
      const model=e.status==='success'&&e.mode==='model';
      return `<article class="shared-ai"><span class="chip">${model?'模型分析':e.status==='pending'?'分析中':e.status==='discarded'?'已丢弃的过期回复':'规则解释 / AI 未连接'} · ${esc(source(e.input.source))}</span><p>${esc(model?e.result?.observation:e.status==='pending'?'等待模型返回。':'没有可作为当前模型结论的结果。')}</p><details><summary>查看固定输入、引用及局限</summary><pre>${esc(JSON.stringify(e,null,2))}</pre></details>${(e.result?.eventReferences||[]).map(id=>`<button class="text-link" data-focus-event="${esc(id)}">定位引用事件 →</button>`).join('')}</article>`;
    }).join(''):'<div class="empty-ai"><b>等待有效模型结果</b><p>尚未调用模型。配置并授权后，可在采集页分析当前记录；未连接时明确显示规则解释。</p></div>';ai.dataset.key=aiKey;}
    const raw=document.getElementById('sharedRaw');if(raw&&raw.closest('details').open)raw.textContent=JSON.stringify({sessionId:r.id,sources:r.sources,latestEmg:r.samples.at(-1)||null,latestCamera:r.cameraObservations.at(-1)||null,physicalFeedback:r.physicalFeedback},null,2);
  }
  function focusEvent(sessionId,eventId) {
    if(sessionId!==sessions.current?.id){if(!sessions.select(sessionId))return;}
    refresh();const node=[...document.querySelectorAll('[data-event-id]')].find(el=>el.dataset.eventId===eventId);
    if(node){const older=node.closest('details');if(older)older.open=true;node.scrollIntoView({behavior:'auto',block:'center'});node.focus();node.classList.add('is-focused');setTimeout(()=>node.classList.remove('is-focused'),2500);}
  }
  document.addEventListener('change',e=>{if(e.target.id==='selectSharedSession'){sessions.select(e.target.value);refresh();}});
  document.addEventListener('input',e=>{if(e.target.id==='professionalNote'&&e.target.dataset.sessionId)reviewDrafts.set(e.target.dataset.sessionId,e.target.value);});
  document.addEventListener('toggle',e=>{if(e.target.classList?.contains('shared-raw'))refresh();},true);
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    const r=sessions.current;if(button.dataset.focusEvent&&r)focusEvent(r.id,button.dataset.focusEvent);
    if(button.id==='exportSharedSession'&&r)window.AirflowLive.downloadBlob(`膝望-${r.source}-${r.id}.json`,JSON.stringify(sessions.export(r.id),null,2),'application/json');
    if(['reviewSharedSession','requestMoreRecord'].includes(button.id)&&r){sessions.review(r.id,button.id==='reviewSharedSession'?'reviewed':'needs_more',document.getElementById('professionalNote').value);refresh();}
  });
  window.addEventListener('airflow:focus-event',e=>focusEvent(e.detail.sessionId,e.detail.eventId));
  sessions.subscribe(()=>{refresh();window.AirflowAIView?.observer.tick();});
  window.AirflowRoadshow={sessionPanel,professional,records,refresh,source,reviewLabel};
})();
