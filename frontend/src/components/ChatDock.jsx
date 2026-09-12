import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';

const SUGGESTIONS = [
  { label: '🎪 Events', query: '🎪 What events are happening today?' },
  { label: '🛠️ Workshops', query: '🛠️ Tell me about the tech workshops' },
  { label: '🍕 Food & Cafe', query: '🍕 Where can I grab food or coffee?' },
];

export function ChatDock({ onSendMessage, isGenerating, onTriggerAction }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <footer className="bottom-dock">
      {/* Suggestion Chips */}
      <div className="chips-tray">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            className="chip"
            onClick={() => onSendMessage(s.query)}
            disabled={isGenerating}
          >
            {s.label}
          </button>
        ))}
        <button
          className="chip chip--action"
          onClick={() => onTriggerAction('wave')}
        >
          👋 Wave
        </button>
        <button
          className="chip chip--action"
          onClick={() => onTriggerAction('giggle')}
        >
          ✨ Spin
        </button>
      </div>

      {/* Input Bar */}
      <div className="input-bar">
        <div className="input-bar__field-wrap">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Astra anything..."
            rows={1}
            maxLength={2000}
            aria-label="Message Astra"
          />
        </div>
        <button
          className="input-bar__send"
          onClick={handleSubmit}
          disabled={!input.trim() || isGenerating}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </footer>
  );
}
