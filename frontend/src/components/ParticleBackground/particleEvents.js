/* ===================================================================
   PARTICLE EVENTS — Singleton event dispatcher & public API
   Application-facing interface. Framework-agnostic.
   =================================================================== */

class ParticleEventBus {
  constructor() {
    this._listeners = {};
    this._engine = null;
  }

  /** Register the engine instance (called internally by ParticleEngine) */
  _setEngine(engine) {
    this._engine = engine;
  }

  // ── Event System ──

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this._listeners[event];
    if (!list) return;
    const idx = list.indexOf(fn);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(event, data) {
    const list = this._listeners[event];
    if (list) list.forEach(fn => fn(data));
  }

  // ── Public API Methods ──

  setState(state) {
    if (this._engine) this._engine.setState(state);
    this.emit('stateChange', state);
  }

  triggerShockwave(x, y) {
    if (this._engine) this._engine.triggerShockwave(x, y);
    this.emit('shockwave', { x, y });
  }

  setProgress(progress) {
    if (this._engine) this._engine.setProgress(progress);
    this.emit('progress', progress);
  }

  setInteraction(x, y, z) {
    if (this._engine) this._engine.setInteraction(x, y, z);
  }

  setActionType(type) {
    if (this._engine) this._engine.setActionType(type);
    this.emit('actionType', type);
  }

  // ── Convenience State Shortcuts ──

  success() {
    this.setState('success');
  }

  error() {
    this.setState('error');
  }

  // ── MCP Methods ──

  mcpStart(opts = {}) {
    if (this._engine) this._engine.setActionType(opts.tool || 'default');
    this.setState('mcp-action');
    this.emit('mcpStart', opts);
  }

  mcpProgress(opts = {}) {
    this.setProgress(opts.progress || 0);
    this.emit('mcpProgress', opts);
  }

  mcpSuccess(opts = {}) {
    this.success();
    this.emit('mcpSuccess', opts);
  }

  mcpError(opts = {}) {
    this.error();
    this.emit('mcpError', opts);
  }

  // ── Web Pull Methods ──

  startWebPull() {
    this.setState('web-pull');
  }

  stopWebPull() {
    this.setState('idle');
  }

  setWebSource(position) {
    if (this._engine) this._engine.setWebSource(position);
  }

  // ── Lifecycle ──

  destroy() {
    this._listeners = {};
    this._engine = null;
  }
}

// Singleton instance
export const particleEngine = new ParticleEventBus();

// Expose globally for external tool / MCP callers
if (typeof window !== 'undefined') {
  window.astraParticles = particleEngine;
}
