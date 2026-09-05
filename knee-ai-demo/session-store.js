/* One in-memory source of truth for this browser. No identity, cloud sync or device commands. */
(function (root) {
  'use strict';
  const SENSOR_SOURCES = ['serial', 'simulated', 'replay'];
  const LABELS = {recording_started:'开始网页记录', recording_ended:'结束网页记录', manual_end:'主动结束（操作者人工标注）', manual_pause:'暂停（操作者人工标注）', review_requested:'请求专业复核（操作者标注）'};
  class SessionStore {
    constructor({now = () => Date.now()} = {}) {
      this.now = now; this.records = []; this.activeId = null; this.selectedId = null;
      this.counter = 0; this.listeners = new Set(); this.sequences = new Map();
    }
    get active() { return this.get(this.activeId); }
    get current() { return this.get(this.selectedId) || this.active || this.records[0] || null; }
    get(id) { return this.records.find(r => r.id === id) || null; }
    list() { return this.records.slice(); }
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    notify(reason, record) { for (const fn of this.listeners) fn({reason, record}); }
    touch(record, reason, content = true) {
      record.version++; if (content) record.contentVersion++;
      this.notify(reason, record);
    }
    select(id) { if (!this.get(id)) return false; this.selectedId = id; this.notify('selected', this.current); return true; }
    start(snapshot, context = {}) {
      if (this.active || !snapshot || !SENSOR_SOURCES.includes(snapshot.source) || !Number.isInteger(snapshot.generation)) return null;
      const at = this.now(), id = `session-${at}-${++this.counter}`;
      const record = {schemaVersion:2, id, sessionId:id, version:1, contentVersion:1, startedAt:at, endedAt:null,
        source:snapshot.source, sources:[snapshot.source], generation:snapshot.generation, protocol:snapshot.protocol,
        context:{role:context.role === 'therapist' ? 'therapist' : 'patient', taskSource:'team_demo_script', task:'受控动作记录演示；非个体训练处方'},
        samples:[], cameraObservations:[], events:[], aiHistory:[], lowEdges:0, reason:null,
        physicalFeedback:{pressure:null, assistance:null, pumpState:null, verification:'unverified'},
        review:{status:'pending', note:'', reviewedAt:null, reviewerRole:null, contentVersion:null}, reviewHistory:[]};
      this.records.unshift(record); this.activeId = id; this.selectedId = id; this.sequences.set(id,new Set());
      if (this.records.length > 40) { const removed=this.records.pop(); this.sequences.delete(removed.id); }
      this.event(record, 'recording_started', 'system', at, LABELS.recording_started);
      this.notify('started', record); return record;
    }
    event(record, type, source, capturedAt, text, extra = {}) {
      const eventId = `${record.id}-event-${record.events.length + 1}`;
      const event = {eventId, sessionId:record.id, type, source, capturedAt, receivedAt:this.now(), text, ...extra};
      record.events.push(event); this.touch(record,'event'); return event;
    }
    addSample(point, generation) {
      const r=this.active;
      if (!r || !point || point.source !== r.source || generation !== r.generation || point.protocol !== r.protocol ||
          !Number.isFinite(point.emg) || !Number.isFinite(point.at) || !Number.isFinite(point.receivedAt) || point.at < r.startedAt || r.samples.length >= 10000) return false;
      if (point.protocol === 'telemetry') {
        const seen=this.sequences.get(r.id), key=`seq-${point.seq}`;
        if (seen.has(key)) return false; seen.add(key);
      }
      r.samples.push({...point, sessionId:r.id, validity:'valid'}); this.touch(r,'sample'); return true;
    }
    addGPIO(detail, snapshot) {
      const r=this.active;
      if (!r || r.source !== snapshot.source || r.generation !== snapshot.generation || !['HIGH','LOW'].includes(detail?.a5)) return false;
      if (detail.a5 === 'LOW') r.lowEdges++;
      this.event(r,'gpio_changed',r.source,detail.at,`A5 → ${detail.a5}（控制器电平；非实际气压反馈）`,{a5:detail.a5}); return true;
    }
    addCamera(detail) {
      const r=this.active;
      if (!r || !detail || !['camera','replay'].includes(detail.source) || !Number.isFinite(detail.capturedAt) || detail.capturedAt < r.startedAt ||
          (detail.sessionId && detail.sessionId !== r.id) || r.cameraObservations.length >= 10000 ||
          (detail.measurement !== undefined && detail.measurement !== 'projected_2d_flexion') ||
          (detail.unit !== undefined && detail.unit !== 'degree')) return false;
      const angle = Number.isFinite(detail.angleDeg) && detail.angleDeg >= 0 && detail.angleDeg <= 180 ? detail.angleDeg : null;
      const observation = {sessionId:r.id, source:detail.source, capturedAt:detail.capturedAt, receivedAt:this.now(),
        angleDeg:angle, validity:typeof detail.validity === 'string' ? detail.validity.slice(0,80) : angle === null ? 'unavailable' : 'valid',
        side:['left','right'].includes(detail.side) ? detail.side : 'unknown', measurement:'projected_2d_flexion', unit:'degree'};
      if (Number.isFinite(detail.mediaTime)) observation.mediaTime=detail.mediaTime;
      const previous=r.cameraObservations[r.cameraObservations.length-1];
      if (previous?.capturedAt === observation.capturedAt && previous.source === observation.source && previous.side === observation.side) return false;
      r.cameraObservations.push(observation); if (!r.sources.includes(observation.source)) r.sources.push(observation.source);
      // Camera detail is sampled in its own array; the timeline shows source/side/validity changes, not every frame.
      if (!previous || previous.source !== observation.source || previous.side !== observation.side || previous.validity !== observation.validity)
        this.event(r,'camera_observation',observation.source,observation.capturedAt,
          `${observation.source === 'camera' ? '摄像头观察' : '录像回放观察'} · ${{left:'左侧',right:'右侧',unknown:'侧别未知'}[observation.side]} · ${angle === null ? '角度未测得' : '二维屈曲角估计已记录（度）'}`,
          {validity:observation.validity,side:observation.side,measurement:observation.measurement,unit:observation.unit});
      else this.touch(r,'camera');
      return true;
    }
    addManualEvent(type) {
      if (!this.active || !['manual_end','manual_pause','review_requested'].includes(type)) return null;
      return this.event(this.active,type,'manual',this.now(),LABELS[type]);
    }
    finish(reason = '手动结束') {
      const r=this.active; if (!r) return null;
      r.endedAt=this.now(); r.reason=String(reason).slice(0,200); this.activeId=null;
      this.event(r,'recording_ended','system',r.endedAt,`网页记录结束：${r.reason}`);
      this.notify('finished',r); return r;
    }
    attachAI(entry) {
      const r=this.get(entry?.input?.sessionId), input=entry?.input;
      if (!r || input.source !== r.source || input.generation !== r.generation || !input.requestId) return false;
      const index=r.aiHistory.findIndex(e => e.input.requestId === input.requestId);
      if (index >= 0) r.aiHistory[index]=entry; else r.aiHistory.push(entry);
      // Keep the observer's entry reference: its lifecycle updates pending → completed/discarded in place.
      this.touch(r,'ai'); return true;
    }
    aiChanged(entry) { const r=this.get(entry?.input?.sessionId); if (r && r.aiHistory.includes(entry)) this.touch(r,'ai'); }
    review(id, status, note = '') {
      const r=this.get(id); if (!r || !['reviewed','needs_more'].includes(status)) return false;
      r.review={status,note:String(note).slice(0,500),reviewedAt:this.now(),reviewerRole:'professional',contentVersion:r.contentVersion};
      r.reviewHistory.push({...r.review}); this.touch(r,'review',false); return true;
    }
    needsReview(r = this.current) { return Boolean(r && (r.review.status === 'pending' || r.review.contentVersion !== r.contentVersion)); }
    export(id = this.current?.id) { const r=this.get(id); return r ? JSON.parse(JSON.stringify(r)) : null; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports={SessionStore};
  if (root && root.document) { root.AirflowSessionStore=SessionStore; root.AirflowSessions=new SessionStore(); }
})(typeof window !== 'undefined' ? window : globalThis);
