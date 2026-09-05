/* Pure, bounded parser. Browser global + Node tests, no dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AirflowProtocol = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e9;
  const uint = n => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
  function parseLine(text) {
    if (typeof text !== 'string' || text.length > 1024) return null;
    const line = text.trim();
    if (!line) return null;
    if (numeric.test(line)) {
      const emg = Number(line);
      return finite(emg) ? { kind: 'legacy', emg } : null;
    }
    if (line[0] !== '{') return null;
    let p;
    try { p = JSON.parse(line); } catch (_) { return null; }
    if (!p || p.v !== 1) return null;
    if (p.type === 'boot' && p.fw === 'airflow-observer-v1') {
      return {kind: 'boot', firmware: p.fw};
    }
    if (p.type !== 'telemetry' || !uint(p.t_ms) || !uint(p.sample_ms) || !uint(p.seq) ||
        !Number.isInteger(p.raw) || p.raw < 0 || p.raw > 1023 || !finite(p.emg) ||
        !finite(p.threshold) || !['HIGH', 'LOW'].includes(p.a5) ||
        !['idle', 'trigger_hold', 'rest'].includes(p.phase)) return null;
    const sampleAge = (p.t_ms - p.sample_ms) >>> 0;
    if (sampleAge > 60000) return null;
    return {kind: 'telemetry', emg: p.emg, raw: p.raw, threshold: p.threshold,
      a5: p.a5, phase: p.phase, seq: p.seq, t_ms: p.t_ms, sample_ms: p.sample_ms, sampleAge};
  }
  class LineFramer {
    constructor(maxLength = 1024) { this.maxLength = maxLength; this.pending = ''; this.dropping = false; }
    push(chunk) {
      const lines = [];
      for (const char of chunk) {
        if (char === '\n') {
          if (!this.dropping) lines.push(this.pending.replace(/\r$/, ''));
          this.pending = ''; this.dropping = false;
        } else if (!this.dropping) {
          this.pending += char;
          if (this.pending.length > this.maxLength) { this.pending = ''; this.dropping = true; }
        }
      }
      return lines;
    }
  }
  return {parseLine, LineFramer};
});
