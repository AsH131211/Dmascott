<p align="center">
  <h1 align="center">✨ Astra</h1>
  <p align="center">
    <strong>Interactive 3D AI Mascot for GECW Tech Fest — Rust backend + Three.js frontend</strong>
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#prerequisites">Prerequisites</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#usage">Usage</a> •
    <a href="#configuration">Configuration</a> •
    <a href="#project-structure">Project Structure</a> •
    <a href="#contributing">Contributing</a> •
    <a href="#license">License</a>
  </p>
</p>

---

## Overview

**Astra** is the official interactive mascot for the GECW Tech Fest. It combines a **Rust-powered backend** serving a real-time LLM chat API with a **React + Three.js frontend** that renders a fully procedural, animated 3D robot character directly in the browser.

The 3D mascot features dynamic facial expressions on a glowing visor screen, gaze tracking, click reactions, floating hover physics, and a flowing cape — all built without any external 3D model files using purely procedural Three.js geometry.

---

## Features

| Feature | Description |
|---|---|
| 🤖 **3D Interactive Mascot** | Fully procedural Three.js character with white ceramic armor, glowing cyan accents, ear fin antennas, cape, and thruster boots |
| 👀 **Animated Face Visor** | Dynamic canvas-textured visor with smiling eyes (`^ ^`), procedural blinking, cursor gaze tracking, and emotional expressions |
| 💬 **Real-Time Chat** | SSE-streamed responses from the Rust backend with typing animation and speech bubble UI |
| 🌌 **Cosmic 3D Scene** | Rotating starfield, data dust particles, neon ground projection, and studio PBR lighting with environment reflections |
| 🎭 **Dynamic Expressions** | Happy, thinking, speaking, poked, and winking face states that react to user interaction |
| 🔄 **Streaming Responses** | Token-by-token SSE streaming from any OpenAI-compatible local LLM |
| 🧠 **Multi-Turn Memory** | Full conversation history maintained in-memory for context-aware follow-up responses |
| 🔌 **LLM Fallback** | Smart fallback responses when the local LLM server is offline |
| ⚡ **Async Rust Backend** | Built on Axum + Tokio for high-performance async serving |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Frontend)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ AstroCanvas  │  │  ChatDock    │  │  SpeechBubbles    │  │
│  │ (Three.js)   │  │  (React)     │  │  (React)          │  │
│  │ 3D Mascot    │  │  Input bar   │  │  Floating cards   │  │
│  │ + Starfield  │  │  + Chips     │  │  + Dismiss        │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────┘  │
│         │                  │                                  │
│         └──── App.jsx ─────┘                                  │
│              (State coordination)                             │
├───────────────────────┬───────────────────────────────────────┤
│                       │  POST /api/chat (SSE)                 │
│                       ▼                                       │
│            ┌─────────────────────┐                            │
│            │   Axum Web Server   │  ← Serves web/ static     │
│            │   (src/main.rs)     │     files + API            │
│            ├─────────┬───────────┤                            │
│            │ llm.rs  │ memory.rs │                            │
│            │ Chat    │ History   │                            │
│            └────┬────┴───────────┘                            │
│                 │                                             │
│                 ▼                                             │
│      ┌─────────────────────┐                                  │
│      │  Local LLM Server   │                                  │
│      │  (OpenAI-compatible) │                                  │
│      │  :8080               │                                  │
│      └─────────────────────┘                                  │
└───────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Rust toolchain** (1.85+, edition 2024) — install via [rustup](https://rustup.rs/):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

- **Node.js** (v20+) — for building the frontend:
  ```bash
  # Using nvm (recommended)
  nvm install 20
  ```

- **A locally running LLM server** (optional — Astra falls back to built-in responses when offline). Compatible servers:
  - [llama.cpp](https://github.com/ggerganov/llama.cpp) — `llama-server -m <model.gguf> --port 8080`
  - [Ollama](https://ollama.com/) — `ollama serve`
  - [LM Studio](https://lmstudio.ai/) — start the local server from the UI
  - [vLLM](https://github.com/vllm-project/vllm) — `vllm serve <model> --port 8080`

---

## Getting Started

### 1. Clone the Repository

```bash
<<<<<<< HEAD
git clone https://github.com/AsH131211/astra.git
cd astra
=======
git clone https://github.com/AsH131211/Dmascott.git
cd Dmascott
>>>>>>> 7209276 (2 st commit)
```

### 2. Install Frontend Dependencies & Build

```bash
npm install
npm run build
```

This compiles the React + Three.js frontend into `web/`, which the Rust server serves as static files.

### 3. Build & Run the Server

```bash
cargo run
```

You'll see:

```
═════════════════════════════════════════════════════════
✨ Astra 3D Interactive Mascot & LLM Server Started!
🌐 Access 3D Web UI:  http://localhost:3000
🔌 API Endpoint:      http://localhost:3000/api/chat
💬 Terminal CLI Mode: cargo run -- --cli
═════════════════════════════════════════════════════════
```

### 4. Open in Browser

Navigate to **http://localhost:3000** to interact with the 3D Astra mascot.

---

## Usage

### Web UI (3D Interactive Mode)

- **Move your mouse** — Astra's head and eyes track your cursor
- **Click on Astra** — triggers a poke reaction (squeeze eyes, excited bounce)
- **Type in the chat bar** — sends your message to the LLM backend
- **Suggestion chips** — quick-access prompts for Events, Workshops, etc.
- **Scroll orbit** — rotate the 3D camera around Astra

### Terminal CLI Mode

```bash
cargo run -- --cli
```

```
Astra : Hey there! 👋 I'm Astra, your friendly Tech Fest guide!

>>> : What events are happening today?
Astra : Great question! Let me tell you about today's lineup...

>>> : exit
```

---

## Configuration

| Parameter | Location | Default | Description |
|---|---|---|---|
| **Web Server Port** | `src/main.rs` | `3000` (auto-fallback to `3001+`) | HTTP port for the web UI and API |
| **LLM API URL** | `src/llm.rs` | `http://127.0.0.1:8080` | Local LLM server endpoint |
| **System Prompt** | `src/llm.rs` | *"You are Astra, mascot for GECW Tech Fest..."* | Astra's personality definition |
| **Temperature** | `src/llm.rs` | `0.7` | Response randomness (0.0–1.0) |
| **Max Tokens** | `src/llm.rs` | `1000` | Token limit per response |
| **Static Files Dir** | `src/main.rs` | `web/` | Frontend build output directory |

---

## Project Structure

```
astra/
├── Cargo.toml              # Rust package manifest
├── Cargo.lock              # Locked dependency versions
├── package.json            # Node.js manifest (frontend build)
├── vite.config.js          # Vite bundler config
├── .gitignore
├── README.md
│
├── src/                    # Rust Backend
│   ├── main.rs             # Axum server — static file serving + API routes
│   ├── llm.rs              # LLM client — SSE streaming, fallback responses
│   ├── memory.rs           # Multi-turn conversation memory
│   └── io.rs               # Terminal I/O for CLI mode
│
├── frontend/               # React + Three.js Frontend Source
│   ├── src/
│   │   ├── main.jsx        # React entry point
│   │   ├── App.jsx         # Root component — state coordination
│   │   ├── App.css         # Global styles
│   │   ├── components/
│   │   │   ├── AstroCanvas.jsx    # Three.js 3D viewport & animation loop
│   │   │   ├── ChatDock.jsx       # Floating chat input bar
│   │   │   ├── SpeechBubbles.jsx  # 3D-projected message bubbles
│   │   │   └── TopNav.jsx         # Brand badge
│   │   └── utils/
│   │       └── astra3DModel.js    # Procedural 3D mascot builder
│   └── public/             # Static assets
│
└── web/                    # Production build output (served by Rust)
    ├── index.html
    └── assets/
        ├── index-*.js      # Bundled JS
        └── index-*.css     # Bundled CSS
```

### Backend Dependencies

| Crate | Purpose |
|---|---|
| [`axum`](https://crates.io/crates/axum) | Web framework — routing, middleware |
| [`tokio`](https://crates.io/crates/tokio) | Async runtime |
| [`tower-http`](https://crates.io/crates/tower-http) | Static file serving, CORS |
| [`reqwest`](https://crates.io/crates/reqwest) | HTTP client for LLM API |
| [`serde`](https://crates.io/crates/serde) / [`serde_json`](https://crates.io/crates/serde_json) | JSON serialization |
| [`async-stream`](https://crates.io/crates/async-stream) | SSE token streaming |

### Frontend Dependencies

| Package | Purpose |
|---|---|
| [`react`](https://react.dev/) | UI framework |
| [`three`](https://threejs.org/) | 3D rendering engine |
| [`vite`](https://vite.dev/) | Build tooling |
| [`lucide-react`](https://lucide.dev/) | Icon library |

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** with descriptive messages: `git commit -m "feat: add new expression state"`
4. **Push** and open a Pull Request

### Guidelines

- Rust: `cargo fmt` + `cargo clippy` with no warnings
- Frontend: consistent code style, no console warnings
- Follow [Conventional Commits](https://www.conventionalcommits.org/)

---

## Roadmap

- [x] 3D interactive web mascot with Three.js
- [x] SSE streaming chat with Rust backend
- [x] Procedural facial expressions and gaze tracking
- [x] Multi-turn conversation memory
- [ ] Environment variable / config file support
- [ ] Voice input / TTS output
- [ ] Conversation export (save chat history)
- [ ] Mobile touch gesture support
- [ ] Multiplayer / shared mascot sessions

---

## License

This project is open source. Add a `LICENSE` file to specify your preferred license.

---

<p align="center">
  Built with 🦀 Rust, ⚛️ React, 🎮 Three.js, and ❤️ for GECW Tech Fest
</p>
