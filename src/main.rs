mod face;
mod io;
mod llm;
mod memory;

use axum::{
    extract::State,
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};
use face::{FaceRegisterRequest, FaceStore};
use futures_util::stream::Stream;
use serde::{Deserialize, Serialize};
use std::{convert::Infallible, net::SocketAddr, sync::Arc, time::Duration};
use tokio::sync::Mutex;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};
use tracing::{info, warn, error};

#[derive(Clone)]
struct AppState {
    chat: Arc<Mutex<llm::Chat>>,
    face_store: Arc<Mutex<FaceStore>>,
}

#[derive(Deserialize)]
struct ChatRequest {
    message: String,
}

#[derive(Serialize)]
struct StatusResponse {
    status: &'static str,
    backend: &'static str,
    faces_registered: usize,
}

#[tokio::main]
async fn main() {
    // Initialize structured logging
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(false)
        .with_level(true)
        .with_ansi(true)
        .init();

    let args: Vec<String> = std::env::args().collect();

    if args.iter().any(|arg| arg == "--cli") {
        run_cli_mode().await;
        return;
    }

    // ─── Initialize shared state ────────────────────────────
    let face_store = FaceStore::new();
    let face_count = face_store.list().len();
    info!("📂 Loaded {} registered face(s) from disk", face_count);

    let state = AppState {
        chat: Arc::new(Mutex::new(llm::Chat::new())),
        face_store: Arc::new(Mutex::new(face_store)),
    };

    // ─── Build router ───────────────────────────────────────
    let app = Router::new()
        .route("/api/status", get(get_status))
        .route("/api/chat", post(chat_handler))
        .route("/api/faces", get(get_faces))
        .route("/api/faces/register", post(register_face))
        .fallback_service(ServeDir::new("web"))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    // ─── Bind to port ───────────────────────────────────────
    let default_port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let mut current_port = default_port;
    let listener = loop {
        let addr: SocketAddr = format!("0.0.0.0:{}", current_port)
            .parse()
            .expect("Invalid socket address");

        match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => break l,
            Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => {
                warn!("Port {} in use, trying {}...", current_port, current_port + 1);
                current_port += 1;
                if current_port > default_port + 10 {
                    error!("No available port between {} and {}", default_port, current_port);
                    std::process::exit(1);
                }
            }
            Err(e) => {
                error!("Failed to bind: {}", e);
                std::process::exit(1);
            }
        }
    };

    // ─── Startup banner ─────────────────────────────────────
    println!();
    println!("  ╔══════════════════════════════════════════════╗");
    println!("  ║       ✨  ASTRA — AI Mascot Server  ✨       ║");
    println!("  ╠══════════════════════════════════════════════╣");
    println!("  ║  Web UI     → http://localhost:{}          ║", current_port);
    println!("  ║  Chat API   → /api/chat  (POST, SSE)        ║");
    println!("  ║  Face API   → /api/faces (GET/POST)         ║");
    println!("  ║  CLI Mode   → cargo run -- --cli             ║");
    println!("  ╚══════════════════════════════════════════════╝");
    println!();
    info!("Server listening on port {}", current_port);

    axum::serve(listener, app).await.unwrap();
}

// ─── API Handlers ───────────────────────────────────────────

async fn get_status(State(state): State<AppState>) -> Json<StatusResponse> {
    let store = state.face_store.lock().await;
    info!("[GET /api/status] → online, {} faces registered", store.list().len());
    Json(StatusResponse {
        status: "online",
        backend: "Rust Axum + Tokio SSE",
        faces_registered: store.list().len(),
    })
}

async fn chat_handler(
    State(state): State<AppState>,
    Json(payload): Json<ChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let msg_preview = if payload.message.len() > 80 {
        format!("{}...", &payload.message[..80])
    } else {
        payload.message.clone()
    };
    info!("[POST /api/chat] ← \"{}\"", msg_preview);

    let mut rx = {
        let mut chat = state.chat.lock().await;
        chat.stream_message(payload.message).await
    };

    let stream = async_stream::stream! {
        let mut token_count: usize = 0;
        while let Some(token) = rx.recv().await {
            token_count += 1;
            let data = serde_json::json!({
                "token": token,
                "done": false
            }).to_string();
            yield Ok(Event::default().data(data));
        }

        let done_data = serde_json::json!({
            "token": "",
            "done": true
        }).to_string();
        yield Ok(Event::default().data(done_data));
        tracing::info!("[POST /api/chat] → streamed {} tokens", token_count);
    };

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

// ─── Face Recognition API ───────────────────────────────────

async fn get_faces(State(state): State<AppState>) -> Json<Vec<face::FaceEntry>> {
    let store = state.face_store.lock().await;
    let count = store.list().len();
    info!("[GET /api/faces] → returning {} face(s)", count);
    Json(store.list().to_vec())
}

#[derive(Serialize)]
struct FaceRegisterResponse {
    success: bool,
    message: String,
}

async fn register_face(
    State(state): State<AppState>,
    Json(payload): Json<FaceRegisterRequest>,
) -> Json<FaceRegisterResponse> {
    let name = payload.name.clone();
    let mut store = state.face_store.lock().await;
    match store.register(payload.name, payload.descriptor) {
        Ok(()) => {
            info!("[POST /api/faces/register] ✅ Registered face: \"{}\" (total: {})", name, store.list().len());
            Json(FaceRegisterResponse {
                success: true,
                message: format!("Face '{}' registered successfully", name),
            })
        }
        Err(e) => {
            warn!("[POST /api/faces/register] ❌ Failed for \"{}\": {}", name, e);
            Json(FaceRegisterResponse {
                success: false,
                message: e,
            })
        }
    }
}

// ─── CLI Mode ───────────────────────────────────────────────

async fn run_cli_mode() {
    println!();
    println!("  ✨ Astra CLI Mode");
    println!("  Type 'exit' or 'quit' to leave.");
    println!();

    let mut chat = llm::Chat::new();
    chat.greet().await;
    println!();

    loop {
        let message = io::read_input();

        if message.eq_ignore_ascii_case("exit") || message.eq_ignore_ascii_case("quit") {
            println!("Astra: Bye! See you at the Tech Fest! 👋");
            break;
        }

        if message.is_empty() {
            continue;
        }

        chat.send(message).await;
        println!();
    }
}
