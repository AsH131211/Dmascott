<p align="center">
  <h1 align="center">✨ Astra</h1>
  <p align="center">
    <strong>An AI-powered conversational chatbot built in Rust — the friendly mascot of your Tech Fest.</strong>
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

**Astra** is a lightweight, terminal-based chatbot written in [Rust](https://www.rust-lang.org/). It connects to a locally hosted LLM server (any OpenAI-compatible `/v1/chat/completions` endpoint) and streams responses in real time, delivering a fluid, character-by-character conversational experience directly in your terminal.

Designed as the friendly mascot for a Tech Fest, Astra greets users warmly on startup and maintains full conversation context across the session.

---

## Features

| Feature | Description |
|---|---|
| 🔄 **Streaming Responses** | Responses are streamed token-by-token using Server-Sent Events (SSE), providing instant visual feedback as the LLM generates text. |
| 💬 **Multi-Turn Conversations** | Full conversation history is maintained in-memory, enabling context-aware follow-up responses. |
| 👋 **Automatic Greeting** | Astra introduces itself at the start of every session with a warm, generated greeting. |
| ⚡ **Async Runtime** | Built on [Tokio](https://tokio.rs/) for high-performance asynchronous I/O. |
| 🧩 **Modular Design** | Clean separation of concerns across modules (`llm`, `io`, `main`). |
| 🔌 **OpenAI-Compatible** | Works with any server that exposes an OpenAI-compatible chat completions API (e.g., [llama.cpp](https://github.com/ggerganov/llama.cpp), [vLLM](https://github.com/vllm-project/vllm), [Ollama](https://ollama.com/), [LM Studio](https://lmstudio.ai/)). |

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                        main.rs                         │
│   Entry point — event loop, user input dispatch        │
├──────────────────────┬─────────────────────────────────┤
│       io.rs          │            llm.rs               │
│  Terminal I/O:       │  Chat client:                   │
│  • Read user input   │  • Manage conversation history  │
│  • Prompt formatting │  • Build API request payloads   │
│                      │  • Stream & parse SSE responses │
└──────────────────────┴─────────────────────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  LLM Server (local) │
                 │  OpenAI-compatible  │
                 │  /v1/chat/completions│
                 └─────────────────────┘
```

---

## Prerequisites

Before running Astra, ensure the following are installed:

- **Rust toolchain** (1.85+, edition 2024) — install via [rustup](https://rustup.rs/):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

- **A locally running LLM server** exposing an OpenAI-compatible API at `http://127.0.0.1:8080/v1/chat/completions`. Popular options include:
  - [llama.cpp server](https://github.com/ggerganov/llama.cpp) — `llama-server -m <model.gguf> --port 8080`
  - [Ollama](https://ollama.com/) — `ollama serve` (default port 11434; adjust URL accordingly)
  - [LM Studio](https://lmstudio.ai/) — start the local server from the UI
  - [vLLM](https://github.com/vllm-project/vllm) — `vllm serve <model> --port 8080`

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/astra.git
cd astra
```

### 2. Start Your LLM Server

Make sure your local LLM server is running. For example, with llama.cpp:

```bash
llama-server -m ./models/your-model.gguf --port 8080
```

### 3. Build & Run

```bash
cargo run
```

For an optimized release build:

```bash
cargo run --release
```

---

## Usage

Once launched, Astra greets you automatically and waits for your input:

```
Astra : Hey there! 👋 I'm Astra, your friendly Tech Fest guide. Ask me anything!

>>> : What events are happening today?
Astra : Great question! Let me tell you about today's lineup...

>>> : exit
Astra : Bye! See you at the Tech Fest! 👋
```

### Commands

| Input | Action |
|---|---|
| Any text | Sends the message to Astra and receives a streamed response |
| `exit` or `quit` | Ends the conversation and exits the program |
| *(empty input)* | Skipped — Astra waits for the next message |

---

## Configuration

Astra's configuration is currently embedded in the source code. Key parameters can be adjusted in [`src/llm.rs`](src/llm.rs):

| Parameter | Location | Default | Description |
|---|---|---|---|
| **API URL** | `Chat::new()` | `http://127.0.0.1:8080/v1/chat/completions` | Endpoint of the LLM server |
| **System Prompt** | `Chat::new()` | *"You are Astra, a mascot for a Tech Fest..."* | Defines Astra's personality and role |
| **Temperature** | `greet()` / `send()` | `0.7` | Controls response randomness (0.0 = deterministic, 1.0 = creative) |
| **Max Tokens (Greeting)** | `greet()` | `200` | Token limit for the initial greeting |
| **Max Tokens (Reply)** | `send()` | `1000` | Token limit for conversation replies |
| **Thinking Mode** | `greet()` / `send()` | `false` | Enables/disables chain-of-thought reasoning via `enable_thinking` |

---

## Project Structure

```
astra/
├── Cargo.toml          # Package manifest & dependency declarations
├── Cargo.lock          # Exact dependency versions (committed for reproducibility)
├── .gitignore          # Git ignore rules
├── README.md           # This file
└── src/
    ├── main.rs         # Entry point — async runtime, REPL event loop
    ├── llm.rs          # LLM client — chat state, API calls, SSE stream parsing
    └── io.rs           # Terminal I/O — user input reading & prompt display
```

### Dependencies

| Crate | Version | Purpose |
|---|---|---|
| [`tokio`](https://crates.io/crates/tokio) | 1.x | Async runtime with full feature set |
| [`reqwest`](https://crates.io/crates/reqwest) | 0.12 | HTTP client with JSON & streaming support |
| [`serde`](https://crates.io/crates/serde) | 1.x | Serialization/deserialization framework |
| [`serde_json`](https://crates.io/crates/serde_json) | 1.x | JSON parsing & construction |
| [`futures-util`](https://crates.io/crates/futures-util) | 0.3.34 | Stream combinators for async byte stream processing |

---

## Contributing

Contributions are welcome! To get started:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes with clear, descriptive messages:
   ```bash
   git commit -m "feat: add configurable API endpoint via environment variable"
   ```
4. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** against `main`

### Guidelines

- Follow standard Rust formatting (`cargo fmt`)
- Ensure all code passes `cargo clippy` without warnings
- Write descriptive commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

---

## Roadmap

- [ ] Environment variable / config file support for API URL and parameters
- [ ] Custom system prompt via CLI argument or config
- [ ] Conversation export (save chat history to file)
- [ ] Colored terminal output with rich formatting
- [ ] Support for multiple LLM backends with auto-detection
- [ ] Token usage tracking and display

---

## License

This project is open source. Add a `LICENSE` file to specify the license under which this project is distributed.

---

<p align="center">
  Built with 🦀 Rust and ❤️ for the Tech Fest
</p>
