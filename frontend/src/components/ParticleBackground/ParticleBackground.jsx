/* ===================================================================
   PARTICLE BACKGROUND — React wrapper component
   Mounts the Three.js particle engine on a fixed background canvas
   =================================================================== */

import React, { useEffect, useRef } from 'react';
import { ParticleEngine } from './particleEngine.js';
import { particleEngine } from './particleEvents.js';
import { ParticleDevOverlay } from './ParticleDevOverlay.jsx';

export function ParticleBackground({ chatState = 'idle' }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const prevStateRef = useRef(chatState);

  // ── Mount: init engine ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ParticleEngine();
    engineRef.current = engine;

    // Wire the event bus to the engine
    particleEngine._setEngine(engine);

    engine.init(canvas);

    return () => {
      engine.dispose();
      particleEngine._setEngine(null);
      engineRef.current = null;
    };
  }, []);

  // ── React chatState prop → engine state mapping ──
  useEffect(() => {
    if (prevStateRef.current === chatState) return;
    prevStateRef.current = chatState;

    // Map Astra chat states to particle engine states
    switch (chatState) {
      case 'thinking':
        particleEngine.setState('loading');
        break;
      case 'streaming':
        particleEngine.setState('web-pull');
        break;
      case 'idle':
      default:
        // Don't override if we're in a transient state (success/error)
        if (engineRef.current) {
          const current = engineRef.current.stateMachine.currentState;
          if (current !== 'success' && current !== 'error' && current !== 'greet') {
            particleEngine.setState('idle');
          }
        }
        break;
    }
  }, [chatState]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="galaxy-canvas"
        aria-hidden="true"
      />
      {import.meta.env.DEV && <ParticleDevOverlay />}
    </>
  );
}
