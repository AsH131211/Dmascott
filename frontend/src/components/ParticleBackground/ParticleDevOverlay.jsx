/* ===================================================================
   PARTICLE DEV OVERLAY — Dev-only keyboard shortcuts & state tester
   Keys 1-8 cycle states, Space triggers shockwave
   =================================================================== */

import React, { useEffect, useState } from 'react';
import { particleEngine } from './particleEvents.js';

const STATE_MAP = {
  '1': 'greet',
  '2': 'idle',
  '3': 'cursor',
  '4': 'loading',
  '5': 'web-pull',
  '6': 'mcp-action',
  '7': 'success',
  '8': 'error',
};

const STATE_LABELS = {
  'greet': '1: GREET',
  'idle': '2: IDLE',
  'cursor': '3: CURSOR',
  'loading': '4: LOADING',
  'web-pull': '5: WEB PULL',
  'mcp-action': '6: MCP ACTION',
  'success': '7: SUCCESS',
  'error': '8: ERROR',
};

export function ParticleDevOverlay() {
  const [activeState, setActiveState] = useState('greet');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onKey = (e) => {
      // Don't capture when typing in inputs
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

      if (e.key === ' ') {
        e.preventDefault();
        particleEngine.triggerShockwave();
        return;
      }

      if (e.key === '`') {
        setVisible(v => !v);
        return;
      }

      const state = STATE_MAP[e.key];
      if (state) {
        if (state === 'mcp-action') {
          particleEngine.mcpStart({ tool: 'github', action: 'search' });
        } else {
          particleEngine.setState(state);
        }
        setActiveState(state);
      }
    };

    const onStateChange = (state) => {
      setActiveState(state);
    };

    document.addEventListener('keydown', onKey);
    const unsub = particleEngine.on('stateChange', onStateChange);

    return () => {
      document.removeEventListener('keydown', onKey);
      unsub();
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: 12,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      pointerEvents: 'none',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      userSelect: 'none',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.7)',
        color: '#8ab4f8',
        padding: '6px 10px',
        borderRadius: 6,
        border: '1px solid rgba(138,180,248,0.2)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ marginBottom: 4, color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
          Particle Dev · backtick to hide
        </div>
        {Object.entries(STATE_LABELS).map(([key, label]) => (
          <div key={key} style={{
            color: activeState === key ? '#4ade80' : '#94a3b8',
            fontWeight: activeState === key ? 600 : 400,
            lineHeight: 1.6,
          }}>
            {activeState === key ? '▸ ' : '  '}{label}
          </div>
        ))}
        <div style={{ marginTop: 4, color: '#64748b', borderTop: '1px solid rgba(100,116,139,0.3)', paddingTop: 4 }}>
          SPACE: shockwave
        </div>
      </div>
    </div>
  );
}
