/* ===================================================================
   PARTICLE STATE MACHINE — Manages states and smooth transitions
   =================================================================== */

export const STATES = {
  GREET:      'greet',
  IDLE:       'idle',
  CURSOR:     'cursor',
  LOADING:    'loading',
  WEB_PULL:   'web-pull',
  MCP_ACTION: 'mcp-action',
  SUCCESS:    'success',
  ERROR:      'error',
};

// States that auto-return to IDLE after their animation completes
const TRANSIENT_STATES = new Set([
  STATES.GREET,
  STATES.SUCCESS,
  STATES.ERROR,
]);

export class ParticleStateMachine {
  constructor() {
    this.currentState = STATES.GREET;
    this.previousState = STATES.IDLE;
    this.transitionProgress = 0;    // 0 = just entered, 1 = fully settled
    this.stateElapsed = 0;          // seconds since entering this state
    this.stateStartTime = 0;
    this.progress = 0;              // External progress for loading/mcp [0..1]
    this.actionType = 'default';    // MCP action type label

    this._onStateChange = null;
  }

  /** Set callback for state changes */
  onStateChange(fn) {
    this._onStateChange = fn;
  }

  /** Transition to a new state */
  setState(newState) {
    if (newState === this.currentState) return;

    this.previousState = this.currentState;
    this.currentState = newState;
    this.transitionProgress = 0;
    this.stateElapsed = 0;
    this.stateStartTime = performance.now() / 1000;

    if (this._onStateChange) {
      this._onStateChange(newState, this.previousState);
    }
  }

  /** Update per-frame; returns true if a transient state completed */
  update(delta, elapsed) {
    this.stateElapsed += delta;

    // Smooth transition progress toward 1.0
    const transitionSpeed = 2.5;
    this.transitionProgress = Math.min(1, this.transitionProgress + delta * transitionSpeed);

    // Handle transient states auto-returning to IDLE
    if (TRANSIENT_STATES.has(this.currentState)) {
      let duration;
      switch (this.currentState) {
        case STATES.GREET:   duration = 2.5; break;
        case STATES.SUCCESS: duration = 0.7; break;
        case STATES.ERROR:   duration = 0.8; break;
        default:             duration = 1.0; break;
      }

      if (this.stateElapsed >= duration) {
        this.setState(STATES.IDLE);
        return true;
      }
    }

    return false;
  }

  /** Get a smooth eased transition value [0..1] */
  getTransitionEase() {
    const t = this.transitionProgress;
    // Ease-out cubic
    return 1 - Math.pow(1 - t, 3);
  }

  /** Whether we are mid-transition */
  isTransitioning() {
    return this.transitionProgress < 0.95;
  }

  setProgress(p) {
    this.progress = Math.max(0, Math.min(1, p));
  }

  setActionType(type) {
    this.actionType = type || 'default';
  }
}
