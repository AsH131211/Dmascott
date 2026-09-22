/* ===================================================================
   APP.JSX — Astra Pure 3D Galaxy Interface
   Full-screen 3D interactive galaxy with floating type area
   =================================================================== */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ParticleField, particleEngine } from './components/ParticleField';
import { ChatDock } from './components/ChatDock';
import { FaceRecognition } from './components/FaceRecognition';
import './App.css';

function formatMessage(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^[•\-\*]\s+(.*)$/gm, '<li class="bullet-item">$1</li>');
  html = html.replace(/(<li.*<\/li>)/s, '<ul class="bullet-list">$1</ul>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // SSE Chat Stream with Rust backend
  const handleSendMessage = async (text) => {
    if (isGenerating) return;

    setIsGenerating(true);
    const userMsg = { id: 'u-' + Date.now(), type: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setStreamingText('');

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
              fullText += payload.token;
              setStreamingText(fullText);
            }
            if (payload.done) break;
          } catch {
            fullText += dataStr;
            setStreamingText(fullText);
          }
        }
      }

      setStreamingText(null);
      setMessages((prev) => [
        ...prev,
        { id: 'b-' + Date.now(), type: 'bot', text: fullText },
      ]);
      particleEngine.success();
    } catch {
      setStreamingText(null);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          type: 'bot',
          text: "✨ Astra is ready! (Note: Running in resilient mode until local LLM server is active).",
        },
      ]);
      particleEngine.error();
    } finally {
      setIsGenerating(false);
    }
  };

  // Face recognition greeting handler
  const handleFaceRecognized = useCallback(
    (name) => {
      // Auto-send a greeting request through the chat pipeline
      handleSendMessage(
        `The user "${name}" has just been recognized by the face recognition camera. Greet them warmly and personally by name! Be enthusiastic and welcoming. Keep it brief (1-2 sentences).`
      );
    },
    [isGenerating]
  );

  const hasMessages = messages.length > 0 || streamingText !== null;

  // Derive galaxy particle state from conversation activity
  const chatState = useMemo(() => {
    if (streamingText !== null && streamingText.length > 0) return 'streaming';
    if (isGenerating) return 'thinking';
    return 'idle';
  }, [isGenerating, streamingText]);

  return (
    <div className="galaxy-app">
      {/* Fully Occupied 3D Galaxy Canvas */}
      <ParticleField chatState={chatState} />

      {/* Floating Translucent Message Stream (only appears when chatting) */}
      {hasMessages && (
        <div className="messages-stream">
          {messages.map((msg) => (
            <div key={msg.id} className={`message message--${msg.type}`}>
              <span dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
            </div>
          ))}

          {streamingText !== null && (
            <div className="message message--bot">
              {streamingText ? (
                <>
                  <span dangerouslySetInnerHTML={{ __html: formatMessage(streamingText) }} />
                  <span className="stream-cursor">▌</span>
                </>
              ) : (
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* The Type Area — Clean, Floating Input Bar */}
      <ChatDock onSendMessage={handleSendMessage} isGenerating={isGenerating} />

      {/* Face Recognition — Webcam Preview (Bottom Left) */}
      <FaceRecognition onFaceRecognized={handleFaceRecognized} />
    </div>
  );
}
