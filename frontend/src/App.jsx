/* ===================================================================
   APP.JSX — Astra Interactive 3D Mascot Web Application
   =================================================================== */

import React, { useState, useEffect } from 'react';
import { AstroCanvas } from './components/AstroCanvas';
import { TopNav } from './components/TopNav';
import { SpeechBubbles } from './components/SpeechBubbles';
import { ChatDock } from './components/ChatDock';
import './App.css';

const RANDOM_THOUGHTS = [
  "Wonder if quantum computers dream in superpositions... 🌌",
  "Don't forget to refuel at Food Truck Alley! 🍕",
  "Hackathon clock is ticking — build something epic! ⚡",
  "My neural circuits are running at peak clock speed! 🤖",
  "Check out the Autonomous Drone workshop in Maker Yard! 🛠️",
  "Ask me anything about today's schedule or workshops! ✨",
  "Tip: You can poke or click me anytime for a reaction! 👋",
];

export default function App() {
  const [actionTrigger, setActionTrigger] = useState('idle');
  const [robotScreenPos, setRobotScreenPos] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      setActionTrigger('wave');
      addMessage({
        id: 'welcome',
        type: 'bot',
        text: "👋 Hi! I'm **Astra**, the GECW Tech Fest mascot! Ask me anything about today's events or workshops!",
      });
      setTimeout(() => setActionTrigger('idle'), 2500);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Idle Thought Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isGenerating && messages.length === 0) {
        const thought = RANDOM_THOUGHTS[Math.floor(Math.random() * RANDOM_THOUGHTS.length)];
        setActionTrigger('think');
        addMessage({
          id: 'thought-' + Date.now(),
          type: 'thought',
          text: thought,
        });
        setTimeout(() => setActionTrigger('idle'), 3500);
      }
    }, 22000);

    return () => clearInterval(interval);
  }, [isGenerating, messages.length]);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
    const duration = Math.min(25000, Math.max(7000, msg.text.length * 60));
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    }, duration);
  };

  const handleDismissMessage = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMascotClick = () => {
    const reactions = ['poke', 'giggle', 'high_five', 'wave'];
    const chosen = reactions[Math.floor(Math.random() * reactions.length)];
    setActionTrigger(chosen);
    setTimeout(() => setActionTrigger('idle'), 1800);
  };

  // SSE Chat Stream with Rust backend
  const handleSendMessage = async (text) => {
    if (isGenerating) return;

    setIsGenerating(true);
    const userMsgId = 'u-' + Date.now();
    addMessage({ id: userMsgId, type: 'user', text });

    // Bot enters thinking state
    setActionTrigger('think');
    setStreamingMessage({ text: '' });

    let hasStartedSpeaking = false;
    let fullText = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const payload = JSON.parse(dataStr);
            if (payload.token) {
              if (!hasStartedSpeaking) {
                hasStartedSpeaking = true;
                setActionTrigger('speaking');
              }
              fullText += payload.token;
              setStreamingMessage({ text: fullText });
            }
            if (payload.done) break;
          } catch {
            fullText += dataStr;
            setStreamingMessage({ text: fullText });
          }
        }
      }

      setStreamingMessage(null);
      addMessage({ id: 'b-' + Date.now(), type: 'bot', text: fullText });
      setActionTrigger('happy');
      setTimeout(() => setActionTrigger('idle'), 2400);

    } catch (err) {
      console.warn('Backend unavailable, showing fallback:', err);
      setStreamingMessage(null);
      addMessage({
        id: 'err-' + Date.now(),
        type: 'bot',
        text: "✨ Astra is ready! (Note: Running in resilient fallback mode until local LLM server is active).",
      });
      setActionTrigger('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      {/* 3D Cosmic Holodeck Canvas & Astra 3D Character */}
      <AstroCanvas
        actionTrigger={actionTrigger}
        onMascotClick={handleMascotClick}
        onRobotPosUpdate={setRobotScreenPos}
      />

      {/* Clean Top Navigation Bar */}
      <TopNav />

      {/* 3D Speech Bubbles & Adaptive Holographic Cards */}
      <SpeechBubbles
        messages={messages}
        streamingMessage={streamingMessage}
        robotScreenPos={robotScreenPos}
        onDismissMessage={handleDismissMessage}
      />

      {/* Clean Minimalist Bottom Dock */}
      <ChatDock
        onSendMessage={handleSendMessage}
        isGenerating={isGenerating}
        onTriggerAction={(action) => {
          setActionTrigger(action);
          setTimeout(() => setActionTrigger('idle'), 2000);
        }}
      />
    </div>
  );
}
