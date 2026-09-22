import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CameraOff, UserPlus } from 'lucide-react';
import { FaceRegistration } from './FaceRegistration';
import './FaceRecognition.css';

const MODEL_URL = '/models';
const MATCH_THRESHOLD = 0.6;
const DETECTION_INTERVAL_MS = 600;

export function FaceRecognition({ onFaceRecognized }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const faceMatcher = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [knownFaces, setKnownFaces] = useState([]);
  const [detectionStatus, setDetectionStatus] = useState('idle');
  const [recognizedName, setRecognizedName] = useState(null);
  const [greetedThisSession, setGreetedThisSession] = useState(new Set());

  // Load face-api.js models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (_) {
        // Models failed to load — face recognition will be unavailable
      }
    }
    loadModels();
  }, []);

  // Fetch known faces from backend
  const fetchKnownFaces = useCallback(async () => {
    try {
      const resp = await fetch('/api/faces');
      if (resp.ok) {
        const data = await resp.json();
        setKnownFaces(data);
        return data;
      }
    } catch (_) {
      // Backend unavailable
    }
    return [];
  }, []);

  useEffect(() => {
    fetchKnownFaces();
  }, [fetchKnownFaces]);

  // Build face matcher from known faces
  useEffect(() => {
    if (knownFaces.length === 0) {
      faceMatcher.current = null;
      return;
    }
    try {
      const labeledDescriptors = knownFaces.map(
        (face) =>
          new faceapi.LabeledFaceDescriptors(face.name, [
            new Float32Array(face.descriptor),
          ])
      );
      faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptors, MATCH_THRESHOLD);
    } catch (_) {
      faceMatcher.current = null;
    }
  }, [knownFaces]);

  // Start / Stop webcam
  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamActive(true);
      setDetectionStatus('no-face');
    } catch (_) {
      // Camera access denied or unavailable
    }
  }, []);

  const stopCam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    setCamActive(false);
    setDetectionStatus('idle');
    setRecognizedName(null);
  }, []);

  useEffect(() => {
    return () => stopCam();
  }, [stopCam]);

  // Face detection loop
  useEffect(() => {
    if (!camActive || !modelsLoaded) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      // Draw overlay
      const canvas = canvasRef.current;
      if (canvas && video.videoWidth > 0) {
        const displaySize = { width: canvas.offsetWidth, height: canvas.offsetHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          const resized = faceapi.resizeResults(detection, displaySize);
          const { x, y, width, height } = resized.detection.box;
          ctx.strokeStyle = faceMatcher.current ? 'rgba(34, 197, 94, 0.6)' : 'rgba(96, 165, 250, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(x, y, width, height);
          ctx.setLineDash([]);
        }
      }

      if (!detection) {
        setDetectionStatus('no-face');
        setRecognizedName(null);
        return;
      }

      if (faceMatcher.current) {
        const match = faceMatcher.current.findBestMatch(detection.descriptor);
        if (match.label !== 'unknown') {
          setDetectionStatus('recognized');
          setRecognizedName(match.label);

          setGreetedThisSession((prev) => {
            if (!prev.has(match.label)) {
              const next = new Set(prev);
              next.add(match.label);
              if (onFaceRecognized) onFaceRecognized(match.label);
              return next;
            }
            return prev;
          });
          return;
        }
      }

      setDetectionStatus('detecting');
      setRecognizedName(null);
    }, DETECTION_INTERVAL_MS);

    detectionLoopRef.current = interval;
    return () => clearInterval(interval);
  }, [camActive, modelsLoaded, onFaceRecognized]);

  // Handle registration
  const handleRegistered = useCallback(
    (entry) => {
      setKnownFaces((prev) => [...prev.filter((f) => f.name !== entry.name), entry]);
      fetchKnownFaces();
    },
    [fetchKnownFaces]
  );

  if (showRegistration) {
    return (
      <FaceRegistration
        onClose={() => setShowRegistration(false)}
        onRegistered={handleRegistered}
        modelsLoaded={modelsLoaded}
      />
    );
  }

  if (!camActive) {
    return (
      <button className="face-toggle-btn" onClick={startCam} title="Enable face recognition">
        <Camera />
        <span>Face ID</span>
      </button>
    );
  }

  const statusClass =
    detectionStatus === 'recognized'
      ? 'face-status-badge--recognized'
      : detectionStatus === 'detecting'
      ? 'face-status-badge--detecting'
      : 'face-status-badge--no-face';

  const statusLabel =
    detectionStatus === 'recognized'
      ? recognizedName
      : detectionStatus === 'detecting'
      ? 'Scanning...'
      : 'No face';

  return (
    <div className="face-panel">
      <div className={`face-cam-container ${detectionStatus === 'recognized' ? 'recognized' : ''}`}>
        <video ref={videoRef} autoPlay muted playsInline />
        <canvas ref={canvasRef} />
        <div className={`face-status-badge ${statusClass}`}>
          <span className="face-status-dot" />
          {statusLabel}
        </div>
        {recognizedName && <div className="face-name-tag">👋 {recognizedName}</div>}
      </div>

      <div className="face-action-bar">
        <button className="face-btn" onClick={() => setShowRegistration(true)} title="Register a new face">
          <UserPlus />
          Register
        </button>
        <button className="face-btn face-btn--cam-off" onClick={stopCam} title="Turn off camera">
          <CameraOff />
          Off
        </button>
      </div>
    </div>
  );
}
