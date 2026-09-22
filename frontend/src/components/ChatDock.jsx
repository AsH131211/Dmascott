import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';

export function ChatDock({ onSendMessage, isGenerating }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
    <div className="chat-dock">
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
    </div>
  );
}
