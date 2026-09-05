/* Local-only visual observation. No upload, no clinical scoring, no actuator access. */
(function () {
  'use strict';
  function projectedFlexion(landmarks, width, height, side) {
    if (!(width > 0 && height > 0) || !['left', 'right'].includes(side)) return null;
    const ids = side === 'left' ? [23, 25, 27] : [24, 26, 28];
    const p = ids.map(i => landmarks?.[i]);
    if (p.some(v => !v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || !(v.visibility >= .6))) return null;
    const ax = (p[0].x-p[1].x)*width, ay = (p[0].y-p[1].y)*height;
    const bx = (p[2].x-p[1].x)*width, by = (p[2].y-p[1].y)*height;
    const length = Math.hypot(ax,ay)*Math.hypot(bx,by);
    if (length < 1e-8) return null;
    return 180-Math.acos(Math.max(-1, Math.min(1,(ax*bx+ay*by)/length)))*180/Math.PI;
  }
  let model = null, modelLoading = null, generation = 0, stream = null, objectURL = null;
  let host = null, raf = null, source = null, lastMediaTime = -1, lastTick = 0, busy = false;
  const $ = id => host?.querySelector('#'+id);
  function panel() {
    return `<section class="camera-observer" aria-labelledby="cameraTitle">
      <div class="camera-heading"><div><h3 id="cameraTitle">看见刚才的动作</h3><p>摄像头观察与肌电各自记录来源，在同一会话中查看。</p></div><span id="cameraSource">未开启</span></div>
      <div class="camera-body"><div class="camera-stage"><video id="cameraVideo" playsinline muted></video><canvas id="cameraCanvas" aria-label="动作观察画面"></canvas><p id="cameraPlaceholder">选择摄像头或本地视频后开始观察</p></div>
      <div class="camera-details"><label for="cameraSide">观察侧</label><select id="cameraSide"><option value="left">左膝</option><option value="right">右膝</option></select><div id="cameraAngle">—</div><p>二维投影屈曲角 · 参考值</p><p id="cameraStatus" role="status">模型和视频均在本机处理。</p></div></div>
      <div class="camera-actions"><button id="cameraLoad" type="button">检查本地动作模型</button><button id="cameraStart" type="button">开启摄像头</button><label class="camera-file" for="cameraFile">选择本地动作视频<input id="cameraFile" type="file" accept="video/*"></label><button id="cameraStop" type="button" disabled>停止观察</button></div>
      <p class="camera-limit">从侧面完整拍到髋、膝、踝。遮挡时不显示角度。画面不上传，记录不代表动作正确、诊断或助力效果；本地视频始终标记为回放。</p>
    </section>`;
  }
  function status(text) { if ($('cameraStatus')) $('cameraStatus').textContent = text; }
  function emit(angleDeg, validity) {
    if (!source) return;
    window.dispatchEvent(new CustomEvent('airflow:camera-observation', {detail: {
      source, capturedAt: Date.now(), angleDeg, validity, side: $('cameraSide')?.value || 'left',
      mediaTime: source === 'replay' ? $('cameraVideo')?.currentTime ?? null : null,
      measurement: 'projected_2d_flexion', unit: 'degree'
    }}));
  }
  async function loadModel() {
    if (model) return model;
    if (modelLoading) return modelLoading;
    status('正在加载本地动作模型…');
    modelLoading = (async () => {
      const {FilesetResolver, PoseLandmarker} = await import('./vision-vendor/vision_bundle.mjs');
      const files = await FilesetResolver.forVisionTasks('./vision-vendor');
      model = await PoseLandmarker.createFromOptions(files, {
        baseOptions: {modelAssetPath: './vision-vendor/pose_landmarker_lite.task', delegate: 'CPU'},
        runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .5,
        minPosePresenceConfidence: .5, minTrackingConfidence: .5
      });
      status('本地动作模型已就绪；尚未连接摄像头。');
      return model;
    })();
    try { return await modelLoading; } finally { modelLoading = null; }
  }
  function stop(reason = '观察已停止。') {
    generation++;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null; busy = false;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    const v=$('cameraVideo');
    if (v) { v.pause(); v.srcObject=null; v.removeAttribute('src'); v.load(); }
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL=null;
    emit(null,'stopped'); source=null; lastMediaTime=-1; lastTick=0;
    if ($('cameraAngle')) $('cameraAngle').textContent='—';
    if ($('cameraSource')) $('cameraSource').textContent='未开启';
    if ($('cameraStop')) $('cameraStop').disabled=true;
    const c=$('cameraCanvas'); if(c) c.getContext('2d').clearRect(0,0,c.width,c.height);
    if ($('cameraPlaceholder')) $('cameraPlaceholder').hidden=false;
    status(reason);
  }
  function loop(token) {
    const tick = now => {
      if(token !== generation || !host?.isConnected || !source) return;
      const v=$('cameraVideo'), c=$('cameraCanvas');
      if(v && c && v.readyState>=2 && v.currentTime!==lastMediaTime && now-lastTick>=200) {
        lastTick=now; lastMediaTime=v.currentTime;
        try {
          const result=model.detectForVideo(v,performance.now());
          const lm=result.landmarks?.[0] || [];
          c.width=v.videoWidth;c.height=v.videoHeight;
          const ctx=c.getContext('2d');ctx.drawImage(v,0,0,c.width,c.height);
          const side=$('cameraSide').value;
          const angle=projectedFlexion(lm,c.width,c.height,side);
          if(angle!==null) {
            const ids=side==='left'?[23,25,27]:[24,26,28];
            ctx.strokeStyle='#4376EB';ctx.lineWidth=Math.max(3,c.width/250);ctx.beginPath();
            ids.forEach((i,j)=>{ const p=lm[i]; if(j===0)ctx.moveTo(p.x*c.width,p.y*c.height);else ctx.lineTo(p.x*c.width,p.y*c.height); });ctx.stroke();
            ctx.fillStyle='#FFFFFF';ids.forEach(i=>{const p=lm[i];ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,6,0,2*Math.PI);ctx.fill();});
          }
          $('cameraAngle').textContent=angle===null?'—':angle.toFixed(0)+'°';
          status(angle===null?'髋、膝或踝未完整可见，暂不显示角度。':'已记录可见的二维动作几何；未判断动作质量。');
          emit(angle,angle===null?'not_visible':'valid');
        } catch (_) { stop('动作模型运行失败，观察已停止。可重新检查本地模型。'); return; }
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  }
  async function start(kind,file) {
    stop(); busy=true; const token=generation;
    status('准备本地观察…');
    try {
      await loadModel(); if(token!==generation || !host?.isConnected)return;
      const v=$('cameraVideo');
      if(kind==='camera') {
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('camera_unavailable');
        const s=await navigator.mediaDevices.getUserMedia({video:{width:1280,height:720},audio:false});
        if(token!==generation || !host?.isConnected){s.getTracks().forEach(t=>t.stop());return;}
        stream=s;v.srcObject=s;
      } else { objectURL=URL.createObjectURL(file);v.src=objectURL; }
      await v.play(); if(token!==generation)return;
      source=kind;busy=false;
      $('cameraSource').textContent=kind==='camera'?'摄像头 · 本机实时':'本地视频 · 回放';
      $('cameraStop').disabled=false;$('cameraPlaceholder').hidden=true;
      loop(token);
    } catch (e) {
      if(token!==generation)return;
      stop(e?.name==='NotAllowedError'?'未取得摄像头权限，可选择本地视频。':'未能开始观察，请检查本地模型、摄像头或视频格式。');
    }
  }
  function mount() {
    const next=document.getElementById('cameraObserverMount'); if(!next || next===host)return;
    if(host)stop();host=next;host.innerHTML=panel();
    $('cameraLoad').addEventListener('click',()=>loadModel().catch(()=>status('模型加载失败。请检查本地文件及浏览器支持。')));
    $('cameraStart').addEventListener('click',()=>{if(!busy)start('camera');});
    $('cameraFile').addEventListener('change',e=>{const f=e.target.files[0];if(f)start('replay',f);});
    $('cameraStop').addEventListener('click',()=>stop());
    $('cameraVideo').addEventListener('ended',()=>stop('本地视频回放结束。'));
    $('cameraSide').addEventListener('change',()=>{emit(null,'side_changed');if($('cameraAngle'))$('cameraAngle').textContent='—';});
  }
  function unmount(){stop();host=null;}
  window.AirflowCamera={panel,mount,unmount,projectedFlexion};
})();
