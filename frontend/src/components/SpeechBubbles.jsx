import React from 'react';
import { X } from 'lucide-react';

export function SpeechBubbles({
  messages,
  streamingMessage,
  robotScreenPos,
  onDismissMessage,
}) {
  if (!robotScreenPos) return null;

  return (
    <div className="speech-bubbles-layer" aria-live="polite">
      {messages.map((msg, index) => {
        const isAdaptive = msg.text.length > 170 || (msg.text.match(/\n/g) || []).length >= 2;
        const stackOffset = (messages.length - 1 - index) * 35;

        let targetX = robotScreenPos.x;
        let targetY = robotScreenPos.y - stackOffset;

        if (isAdaptive) {
          targetX = Math.min(window.innerWidth - 230, Math.max(230, robotScreenPos.x + 30));
          targetY = Math.min(window.innerHeight - 240, Math.max(120, robotScreenPos.y - 40));
        } else if (msg.type === 'user') {
          targetX = robotScreenPos.x + 60;
          targetY = robotScreenPos.y - 70 - stackOffset;
        }

        const clampedX = Math.max(30, Math.min(window.innerWidth - 30, targetX));
        const clampedY = Math.max(70, Math.min(window.innerHeight - 120, targetY));

        return (
          <div
            key={msg.id}
            className={`speech-bubble speech-bubble--${msg.type} ${isAdaptive ? 'adaptive-card' : ''}`}
            style={{
              transform: `translate(-50%, -100%) translate(${clampedX}px, ${clampedY}px)`,
            }}
          >
            {isAdaptive ? (
              <>
                <div className="adaptive-card__header">
                  <span className="card-badge">✨ Astra Response</span>
                  <button
                    className="card-close"
                    onClick={() => onDismissMessage(msg.id)}
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="speech-bubble__content">
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                </div>
              </>
            ) : (
              <div className="speech-bubble__content">
                {msg.type === 'thought' ? (
                  <>
                    <div className="thought-tail">
                      <span className="dot-1"></span>
                      <span className="dot-2"></span>
                    </div>
                    <div className="thought-body">{msg.text}</div>
                  </>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }} />
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Active Streaming Bot Bubble */}
      {streamingMessage && (
        <StreamingBubble
          streamingMessage={streamingMessage}
          robotScreenPos={robotScreenPos}
        />
      )}
    </div>
  );
}

function StreamingBubble({ streamingMessage, robotScreenPos }) {
  const isAdaptive =
    streamingMessage.text.length > 170 ||
    (streamingMessage.text.match(/\n/g) || []).length >= 2;

  let targetX = robotScreenPos.x;
  let targetY = robotScreenPos.y;

  if (isAdaptive) {
    targetX = Math.min(window.innerWidth - 230, Math.max(230, robotScreenPos.x + 30));
    targetY = Math.min(window.innerHeight - 240, Math.max(120, robotScreenPos.y - 40));
  }

  const clampedX = Math.max(30, Math.min(window.innerWidth - 30, targetX));
  const clampedY = Math.max(70, Math.min(window.innerHeight - 120, targetY));

  return (
    <div
      className={`speech-bubble speech-bubble--bot ${isAdaptive ? 'adaptive-card' : ''}`}
      style={{
        transform: `translate(-50%, -100%) translate(${clampedX}px, ${clampedY}px)`,
      }}
    >
      {isAdaptive && (
        <div className="adaptive-card__header">
          <span className="card-badge">✨ Astra Response</span>
        </div>
      )}
      <div className="speech-bubble__content">
        {streamingMessage.text ? (
          <>
            <span
              dangerouslySetInnerHTML={{
                __html: formatMessage(streamingMessage.text),
              }}
            />
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
    </div>
  );
}

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
