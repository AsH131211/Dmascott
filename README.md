<p align="center">
  <h1 align="center">✨ Astra</h1>
  <p align="center">
    <strong>AI-Powered Interactive Mascot with Face Recognition — Built in Rust + React</strong>
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#requirements">Requirements</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#usage">Usage</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#project-structure">Project Structure</a> •
    <a href="#configuration">Configuration</a> •
    <a href="#contributing">Contributing</a>
  </p>
</p>

---

## Overview

**Astra** is the official AI mascot for GECW Tech Fest. It combines a **high-performance Rust backend** (Axum + Tokio) with a **React + Three.js frontend** featuring a 3D particle galaxy interface, real-time LLM chat, and **browser-based face recognition** that greets recognized users by name.

The system runs as a single binary — `cargo run` starts the server and serves the entire web UI, API, and face recognition models from one port.

---

## Features

| Feature | Description |
|---|---|
| 🎭 **Face Recognition** | Browser-side face detection + recognition via face-api.js. Recognized users are auto-greeted by name through the LLM |
| 📸 **Face Registration** | Register faces through a glassmorphism modal — captures 128-float embeddings, no photos stored |
| 💬 **Real-Time LLM Chat** | SSE-streamed token-by-token responses from any OpenAI-compatible local LLM |
| 🌌 **3D Galaxy Interface** | Interactive particle field with dynamic state machine — reacts to chat activity |
| 🧠 **Conversation Memory** | Multi-turn history persisted to disk, restored on restart |
| 🔌 **Smart Fallback** | Context-aware fallback responses when the local LLM is offline |
| 📊 **Terminal Logging** | Structured `tracing` logs — every API request, face registration, and LLM connection status printed to terminal |
| ⚡ **Single Binary** | `cargo run` serves everything — web UI, API, and face models from one port |
| 🖥️ **CLI Mode** | Terminal-only chat via `cargo run -- --cli` |

---

## Requirements

### System

| Requirement | Version | Purpose |
|---|---|---|
| **Rust** | 1.85+ (edition 2024) | Backend compilation |
| **Node.js** | 20+ | Frontend build tooling |
| **npm** | 10+ | Package management |
| **Webcam** | Any USB/built-in | Face recognition (optional) |
| **Modern Browser** | Chrome/Firefox/Edge | WebRTC for camera access |

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

### Local LLM Server (Optional)

Astra connects to a local LLM server on port `8080` for AI responses. When offline, it falls back to built-in context-aware responses. Compatible servers:

| Server | Command |
|---|---|
| [llama.cpp](https://github.com/ggerganov/llama.cpp) | `llama-server -m <model.gguf> --port 8080` |
| [Ollama](https://ollama.com/) | `ollama serve` |
| [LM Studio](https://lmstudio.ai/) | Start local server from UI |
| [vLLM](https://github.com/vllm-project/vllm) | `vllm serve <model> --port 8080` |

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/AsH131211/Dmascott.git
cd Dmascott
```

### 2. Install & Build Frontend

```bash
npm install
npm run build
```

This compiles the React frontend + face-api.js models into `web/`, served by the Rust backend.

### 3. Run

```bash
cargo run
```

You'll see:

```
  INFO 📂 Loaded 0 registered face(s) from disk
  INFO LLM chat initialized (loaded 0 history messages)

  ╔══════════════════════════════════════════════╗
  ║       ✨  ASTRA — AI Mascot Server  ✨       ║
  ╠══════════════════════════════════════════════╣
  ║  Web UI     → http://localhost:3000          ║
  ║  Chat API   → /api/chat  (POST, SSE)        ║
  ║  Face API   → /api/faces (GET/POST)         ║
  ║  CLI Mode   → cargo run -- --cli             ║
  ╚══════════════════════════════════════════════╝

  INFO Server listening on port 3000
```

### 4. Open Browser

Navigate to **http://localhost:3000** — the full 3D galaxy interface with chat and face recognition loads instantly.

---

## Usage

### Web UI

- **Chat** — Type in the floating input bar at the bottom. Astra streams responses token-by-token.
- **Face ID** — Click the "Face ID" button (bottom-left) to enable webcam face recognition.
- **Register Face** — Click "Register" → enter your name → look at camera → "Capture & Register".
- **Auto-Greeting** — Once registered, Astra automatically greets recognized users by name via the LLM.
- **Galaxy Particles** — The 3D particle field reacts to chat state (idle / thinking / streaming).

### CLI Mode

```bash
cargo run -- --cli
```

```
  ✨ Astra CLI Mode
  Type 'exit' or 'quit' to leave.

Astra: Hey there! 👋 I'm Astra, your friendly Tech Fest guide!

>>> : What events are happening today?
Astra: Great question! Here's today's lineup...

>>> : exit
Astra: Bye! See you at the Tech Fest! 👋
```

### Terminal Logs (Example)

All API activity is logged to the terminal with timestamps:

```
2026-09-22T14:10:51Z  INFO 📂 Loaded 2 registered face(s) from disk
2026-09-22T14:10:51Z  INFO FaceStore: loaded 2 face(s) → [Ash, Priya]
2026-09-22T14:10:51Z  INFO LLM chat initialized (loaded 10 history messages)
2026-09-22T14:10:51Z  INFO Server listening on port 3000
2026-09-22T14:11:02Z  INFO [POST /api/chat] ← "Hello Astra!"
2026-09-22T14:11:02Z  INFO LLM connected — streaming response
2026-09-22T14:11:03Z  INFO [POST /api/chat] → streamed 24 tokens
2026-09-22T14:11:05Z  INFO [GET /api/faces] → returning 2 face(s)
2026-09-22T14:11:10Z  INFO [POST /api/faces/register] ✅ Registered face: "Rahul" (total: 3)
2026-09-22T14:11:15Z  INFO [POST /api/chat] ← "The user "Ash" has just been recognized..."
2026-09-22T14:11:15Z  INFO LLM connected — streaming response
2026-09-22T14:11:16Z  INFO [POST /api/chat] → streamed 18 tokens
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ ParticleField │  │  ChatDock    │  │  FaceRecognition     │  │
│  │ (Three.js)    │  │  (React)     │  │  (face-api.js)       │  │
│  │ 3D Galaxy     │  │  Chat input  │  │  Webcam + detection  │  │
│  └──────┬────────┘  └──────┬───────┘  └──────┬───────────────┘  │
│         │                  │                  │                  │
│         └────── App.jsx ───┴──────────────────┘                  │
│                (State coordination)                              │
├─────────────────┬──────────────────────┬────────────────────────┤
│                 │ POST /api/chat (SSE) │ GET/POST /api/faces    │
│                 ▼                      ▼                        │
│       ┌──────────────────────────────────────┐                  │
│       │         Axum Web Server              │                  │
│       │         (src/main.rs)                │                  │
│       ├──────┬──────────┬────────┬───────────┤                  │
│       │ llm  │ memory   │ face   │ io        │                  │
│       │ .rs  │ .rs      │ .rs    │ .rs       │                  │
│       └──┬───┴──────────┴────┬───┴───────────┘                  │
│          │                   │                                   │
│          ▼                   ▼                                   │
│   ┌─────────────┐    ┌─────────────────┐                        │
│   │ Local LLM   │    │ data/            │                        │
│   │ Server:8080 │    │ known_faces.json │                        │
│   └─────────────┘    │ chat_history.json│                        │
│                      └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Server status + registered face count |
| `POST` | `/api/chat` | Send message, receive SSE-streamed response |
| `GET` | `/api/faces` | List all registered face descriptors |
| `POST` | `/api/faces/register` | Register a new face (name + 128-float descriptor) |

---

## Project Structure

```
astra/
├── Cargo.toml                  # Rust dependencies
├── package.json                # Node.js dependencies
├── vite.config.js              # Vite build config (frontend → web/)
│
├── src/                        # ── Rust Backend ──────────────────
│   ├── main.rs                 # Axum server, routes, tracing, startup
│   ├── llm.rs                  # LLM client — SSE streaming + fallback
│   ├── face.rs                 # FaceStore — register, list, persist
│   ├── memory.rs               # Chat history persistence
│   └── io.rs                   # Terminal I/O for CLI mode
│
├── frontend/                   # ── React Frontend ────────────────
│   ├── index.html              # Entry HTML
│   ├── public/
│   │   └── models/             # face-api.js neural network weights
│   │       ├── tiny_face_detector_model-*
│   │       ├── face_landmark_68_model-*
│   │       └── face_recognition_model-*
│   └── src/
│       ├── main.jsx            # React entry
│       ├── App.jsx             # Root — chat + face recognition integration
│       ├── App.css             # Galaxy theme styles
│       └── components/
│           ├── ChatDock.jsx         # Floating chat input bar
│           ├── FaceRecognition.jsx  # Webcam + face detection/matching
│           ├── FaceRecognition.css  # Glassmorphism face UI styles
│           ├── FaceRegistration.jsx # Face capture + registration modal
│           ├── ParticleField.jsx    # Re-export wrapper
│           └── ParticleBackground/  # 3D particle galaxy engine
│               ├── ParticleBackground.jsx
│               ├── particleEngine.js
│               ├── particleBehaviors.js
│               ├── particleConfig.js
│               ├── particleEvents.js
│               ├── particleStateMachine.js
│               └── shaders/
│
├── data/                       # ── Persisted Data ────────────────
│   ├── chat_history.json       # Conversation memory
│   └── known_faces.json        # Registered face descriptors
│
├── models/                     # ── ML Models ─────────────────────
│   └── yunet.onnx              # YuNet face detection model (unused)
│
└── web/                        # ── Production Build Output ───────
    ├── index.html              # Built by Vite
    ├── assets/                 # Bundled JS + CSS
    └── models/                 # face-api.js weights (copied from public/)
```

### Backend Dependencies

| Crate | Purpose |
|---|---|
| [`axum`](https://crates.io/crates/axum) | Web framework — routing, middleware, SSE |
| [`tokio`](https://crates.io/crates/tokio) | Async runtime |
| [`tower-http`](https://crates.io/crates/tower-http) | Static file serving, CORS, request tracing |
| [`reqwest`](https://crates.io/crates/reqwest) | HTTP client for LLM API |
| [`serde`](https://crates.io/crates/serde) / [`serde_json`](https://crates.io/crates/serde_json) | JSON serialization |
| [`tracing`](https://crates.io/crates/tracing) / [`tracing-subscriber`](https://crates.io/crates/tracing-subscriber) | Structured terminal logging |
| [`async-stream`](https://crates.io/crates/async-stream) | SSE token streaming |
| [`chrono`](https://crates.io/crates/chrono) | Timestamp formatting |

### Frontend Dependencies

| Package | Purpose |
|---|---|
| [`react`](https://react.dev/) | UI framework |
| [`three`](https://threejs.org/) | 3D particle galaxy rendering |
| [`face-api.js`](https://github.com/justadudewhohacks/face-api.js) | Browser-side face detection + recognition |
| [`vite`](https://vite.dev/) | Build tooling |
| [`lucide-react`](https://lucide.dev/) | Icon library |

---

## Configuration

| Parameter | File | Default | Description |
|---|---|---|---|
| Server Port | `src/main.rs` | `3000` (auto-fallback `3001+`) | HTTP port for web UI + API |
| LLM API URL | `src/llm.rs` | `http://127.0.0.1:8080` | Local LLM server endpoint |
| System Prompt | `src/llm.rs` | *"You are Astra, mascot for Tech Fest..."* | Astra's personality |
| Temperature | `src/llm.rs` | `0.7` | Response randomness (0.0–1.0) |
| Max Tokens | `src/llm.rs` | `1024` | Token limit per response |
| Face Match Threshold | `FaceRecognition.jsx` | `0.6` | Euclidean distance threshold (lower = stricter) |
| Detection Interval | `FaceRecognition.jsx` | `600ms` | Face detection loop frequency |
| Chat History Limit | `src/memory.rs` | `10` messages | Max saved conversation turns |
| Faces Storage | `src/face.rs` | `data/known_faces.json` | Registered face descriptors file |

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** with descriptive messages: `git commit -m "feat: add new expression state"`
4. **Push** and open a Pull Request

### Code Quality

```bash
# Rust
cargo fmt          # Format code
cargo clippy       # Lint — must pass with no warnings

# Frontend
npm run build      # Must build with no errors
```

---

## Roadmap

- [x] 3D interactive galaxy interface with Three.js
- [x] SSE streaming chat with Rust Axum backend
- [x] Multi-turn conversation memory (persisted)
- [x] Browser-based face recognition (face-api.js)
- [x] Face registration with glassmorphism UI
- [x] Auto-greeting recognized users via LLM
- [x] Structured terminal logging (tracing)
- [x] Smart fallback responses when LLM is offline
- [ ] Voice input / TTS output
- [ ] Multiple face captures per person (improved accuracy)
- [ ] Admin panel for managing registered faces
- [ ] Mobile touch gesture support

---

## License

This project is open source. See `LICENSE` for details.

---

<p align="center">
  Built with 🦀 Rust, ⚛️ React, 🎮 Three.js, 🧠 face-api.js, and ❤️ for GECW Tech Fest
</p>
