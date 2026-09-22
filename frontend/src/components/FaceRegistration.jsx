import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

export function FaceRegistration({ onClose, onRegistered, modelsLoaded }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const [name, setName] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentDescriptor, setCurrentDescriptor] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Start webcam
  useEffect(() => {
    let cancelled = false;

    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (_) {
        setError('Could not access camera');
      }
    }

    startCam();

    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (detectionLoopRef.current) clearInterval(detectionLoopRef.current);
    };
  }, []);

  // Detection loop for registration preview
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      const canvas = canvasRef.current;
      if (canvas && video.videoWidth > 0) {
        const displaySize = { width: canvas.offsetWidth, height: canvas.offsetHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          const resized = faceapi.resizeResults(detection, displaySize);
          const { x, y, width, height } = resized.detection.box;
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, width, height);
          ctx.setLineDash([]);
        }
      }

      if (detection) {
        setFaceDetected(true);
        setCurrentDescriptor(Array.from(detection.descriptor));
      } else {
        setFaceDetected(false);
        setCurrentDescriptor(null);
      }
    }, 400);

    detectionLoopRef.current = interval;
    return () => clearInterval(interval);
  }, [modelsLoaded]);

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !currentDescriptor || registering) return;

    setRegistering(true);
    setError('');

    try {
      const resp = await fetch('/api/faces/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), descriptor: currentDescriptor }),
      });

      const data = await resp.json();
      if (data.success) {
        setSuccess(true);
        if (onRegistered) onRegistered({ name: name.trim(), descriptor: currentDescriptor });
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (_) {
      setError('Network error — is the backend running?');
    } finally {
      setRegistering(false);
    }
  }, [name, currentDescriptor, registering, onRegistered, onClose]);

  if (success) {
    return (
      <div className="face-reg-overlay" onClick={onClose}>
        <div className="face-reg-modal" onClick={(e) => e.stopPropagation()}>
          <div className="face-reg-success">
            <div className="face-reg-success-icon">✓</div>
            <h3>Face Registered!</h3>
            <p>{name.trim()} can now be recognized by Astra</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="face-reg-overlay" onClick={onClose}>
      <div className="face-reg-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Register Your Face</h2>
        <p>Look directly at the camera. Astra will remember your face and greet you by name.</p>

        <div className="face-reg-preview">
          <video ref={videoRef} autoPlay muted playsInline />
          <canvas ref={canvasRef} />
          <div className={`face-reg-indicator ${faceDetected ? 'face-reg-indicator--found' : 'face-reg-indicator--none'}`}>
            {faceDetected ? '✓ Face detected' : '⊘ No face detected'}
          </div>
        </div>

        <div className="face-reg-input-group">
          <input
            className="face-reg-input"
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            maxLength={50}
            autoFocus
          />
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: '12px' }}>{error}</p>
        )}

        <div className="face-reg-actions">
          <button className="face-reg-btn face-reg-btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="face-reg-btn face-reg-btn--primary"
            onClick={handleRegister}
            disabled={!name.trim() || !faceDetected || registering}
          >
            {registering ? 'Registering...' : 'Capture & Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
