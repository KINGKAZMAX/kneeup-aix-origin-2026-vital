/* Product navigation. All role views use the same local session store. */
const state = {role:'patient', page:'overview'};
const app = document.querySelector('#app');
const desktopNav = document.querySelector('#desktopNav');
const patientNav = [['overview','日常行动'],['hardware','开始记录'],['records','我的记录']];
const therapistNav = [['overview','专业复核'],['hardware','采集与观察'],['records','会话记录']];
function braceArt() { return document.querySelector('#braceArt').innerHTML; }
function renderNav() {
  const nav = state.role === 'patient' ? patientNav : therapistNav;
  desktopNav.innerHTML = nav.map(([id,label]) => `<button class="nav-btn ${state.page===id?'active':''}" data-nav="${id}">${label}</button>`).join('');
  document.querySelectorAll('.role-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.role===state.role));
}
function renderPatient() {
  return `<section class="hero-grid roadshow-hero">
    <div class="hero-card"><div class="eyebrow">膝望 / MOBILITY LONGEVITY</div><h1>继续走<br>自己想走的路。</h1>
      <p class="lead">膝望是一套面向中老年人的气动行动辅助原型，将护膝、传感记录与 AI 观察连接起来。</p>
      <div class="hero-actions"><button class="btn cobalt" data-nav="hardware">记录今天这一次 →</button><button class="btn" data-nav="records">查看我的记录</button></div>
      <div class="audience-line">60–75 岁 · 仍能自主行动 · 从日常行动开始</div>
    </div>
    <div class="glass-card roadshow-life"><div class="eyebrow">A LIFE WORTH MOVING FOR</div><div class="roadshow-mountain" aria-label="山路生活目标示意图"><svg viewBox="0 0 500 220" role="img" aria-label="通向远山的弯曲路径"><path d="M0 190 110 80 210 177 315 20 500 172V220H0Z" fill="#2B2D33"/><path d="M0 210 170 125 260 210 430 91 500 150V220H0Z" fill="#3B3E45"/><path d="M255 220C330 180 365 175 300 146S330 85 333 73" stroke="#4376EB" stroke-width="12" fill="none" stroke-linecap="round"/></svg></div>
      <span class="chip">志远 · 62 岁 · 演示人物，非真实个案</span><h2>周末，还想走<br>那条熟悉的山路。</h2><p>这个生活目标，先从今天的一次居家动作记录开始。</p>
    </div></section>
    <section class="section"><div class="section-head"><div><div class="eyebrow">FROM EVERYDAY TO OUTDOOR</div><h2>一个生活目标，三个位置</h2></div></div>
      <div class="roadshow-three"><article class="card"><span class="roadshow-index">01 / 现在的入口</span><h3>日常行动</h3><p>记录一次动作发生了什么，把传感读数、人工标注和观察依据放在一起。</p><button class="text-link" data-nav="hardware">开始一次记录 →</button></article>
      <article class="card"><span class="roadshow-index">02 / 专业服务延伸</span><h3>下一次专业沟通</h3><p>专业人员查看同一份记录并留下复核结果。术后随访是后续验证场景。</p><button class="text-link" data-role-nav="therapist">打开同机专业端 →</button></article>
      <article class="card"><span class="roadshow-index">03 / 希望保留的生活</span><h3>徒步与户外活动</h3><p>继续走自己喜欢的路。户外穿戴、助力效果与使用负担，仍需后续验证。</p><span class="chip">产品愿景</span></article></div>
    </section>
    <section class="plan-grid section"><article class="glass-card plan-card"><div class="eyebrow">TODAY'S DEMO TASK</div><h2>今天准备做什么？</h2><p class="lead">由队员演示一次受控动作，主动标注结束，再查看记录依据与复核结果。</p><div class="session-note">任务来源：团队路演脚本。演示人物、任务场景是虚构说明；采集页会逐项显示实际数据来源。此任务不是为个人制定的训练处方。</div><button class="btn cobalt" data-nav="hardware">进入统一采集页 →</button></article>
      <article class="glass-card steps-card"><div class="eyebrow">WHAT YOU WILL SEE</div><h2>每一步都有依据</h2><div class="step-list"><div class="step"><span class="step-num">1</span><div><b>动作与信号</b><p>肌电读数和摄像头观察分别记录来源。</p></div></div><div class="step"><span class="step-num">2</span><div><b>AI 解释</b><p>查看一条观察所引用的输入与人工事件。</p></div></div><div class="step"><span class="step-num">3</span><div><b>共同查看</b><p>专业端点击复核后，用户端显示同一结果。</p></div></div></div></article></section>
    ${AirflowRoadshow.sessionPanel({compact:true})}
    <section class="card roadshow-product section"><div><div class="eyebrow">AIR-FLOW KNEE+ / PROTOTYPE</div><h2>护膝、传感与观察，逐步验证。</h2><p class="lead">我们希望以气动结构辅助自主行动。本轮展示输入记录与可追溯观察；实际充放气、压力及辅助力分别接受台架验证。</p><p class="usb-caption">图示为结构概念。当前页面不提供助力比例、健康分值或医疗效果结论。</p></div><div class="roadshow-brace">${braceArt()}</div></section>`;
}
function render() {
  window.AirflowCamera?.unmount();
  renderNav();
  if (state.page === 'hardware' || state.page === 'training') app.innerHTML=AirflowLive.panel();
  else if (state.page === 'records') app.innerHTML=AirflowRoadshow.records();
  else if (state.role === 'therapist') app.innerHTML=AirflowRoadshow.professional();
  else app.innerHTML=renderPatient();
  if (state.page === 'hardware' || state.page === 'training') window.AirflowCamera?.mount();
  AirflowLive.refresh(); AirflowRoadshow.refresh();
}
function navigate(page, role) {
  if (role) state.role=role==='therapist'?'therapist':'patient';
  state.page=['overview','hardware','training','records'].includes(page)?page:'overview';
  render(); window.scrollTo({top:0});
}
document.addEventListener('click',e=>{
  const roleNav=e.target.closest('[data-role-nav]');
  if (roleNav) { navigate('overview',roleNav.dataset.roleNav); return; }
  const role=e.target.closest('[data-role]');
  if (role) { navigate('overview',role.dataset.role); return; }
  const nav=e.target.closest('[data-nav]'); if(nav) navigate(nav.dataset.nav);
});
AirflowLive.setContextReader(()=>({role:state.role}));
window.AirflowApp={state,render,navigate};
if (['hardware','training','records'].includes(new URLSearchParams(location.search).get('view'))) state.page=new URLSearchParams(location.search).get('view');
render();
