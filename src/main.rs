mod io;
mod llm;
mod memory;

use axum::{
    extract::State,
    response::sse::{Event, KeepAlive, Sse},
    routing::{get, post},
    Json, Router,
};
use futures_util::stream::Stream;
use serde::{Deserialize, Serialize};
use std::{convert::Infallible, net::SocketAddr, sync::Arc, time::Duration};
use tokio::sync::Mutex;
use tower_http::{cors::CorsLayer, services::ServeDir};

#[derive(Clone)]
struct AppState {
    chat: Arc<Mutex<llm::Chat>>,
}

#[derive(Deserialize)]
struct ChatRequest {
    message: String,
}

#[derive(Serialize)]
struct StatusResponse {
    status: &'static str,
    mascot: &'static str,
    backend: &'static str,
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Support --cli argument for terminal mode
    if args.iter().any(|arg| arg == "--cli") {
        run_cli_mode().await;
        return;
    }

    // Default: Start high-performance Axum Web & 3D Mascot Server
    let state = AppState {
        chat: Arc::new(Mutex::new(llm::Chat::new())),
    };

    let app = Router::new()
        .route("/api/status", get(get_status))
        .route("/api/chat", post(chat_handler))
        .fallback_service(ServeDir::new("web"))
        .layer(CorsLayer::permissive())
        .with_state(state);

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
                eprintln!("⚠️  Port {} is already in use. Trying port {}...", current_port, current_port + 1);
                current_port += 1;
                if current_port > default_port + 10 {
                    eprintln!("❌ Error: Could not find an available port between {} and {}.", default_port, current_port);
                    std::process::exit(1);
                }
            }
            Err(e) => {
                eprintln!("❌ Failed to bind to address: {}", e);
                std::process::exit(1);
            }
        }
    };

    println!("Astra 3D Interactive Mascot & LLM Server Started!");
    println!("Access 3D Web UI:  http://localhost:{}", current_port);
    println!("API Endpoint:      http://localhost:{}/api/chat", current_port);
    println!("Terminal CLI Mode: cargo run -- --cli");

    axum::serve(listener, app).await.unwrap();
}

async fn get_status() -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "online",
        mascot: "Astra 3D Procedural Mascot",
        backend: "Rust Axum + Tokio SSE",
    })
}

async fn chat_handler(
    State(state): State<AppState>,
    Json(payload): Json<ChatRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut rx = {
        let mut chat = state.chat.lock().await;
        chat.stream_message(payload.message).await
    };

    let stream = async_stream::stream! {
        while let Some(token) = rx.recv().await {
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
    };

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

async fn run_cli_mode() {
    let mut chat = llm::Chat::new();

    chat.greet().await;
    println!();

    loop {
        let message = io::read_input();

        if message.eq_ignore_ascii_case("exit") || message.eq_ignore_ascii_case("quit") {
            println!("Astra : Bye! See you at the Tech Fest! 👋");
            break;
        }

        if message.is_empty() {
            continue;
        }

        chat.send(message).await;
        println!();
    }
}
