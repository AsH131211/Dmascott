use futures_util::StreamExt;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;
use tokio::sync::mpsc;

use crate::memory::Memory;

#[derive(Debug, Deserialize)]
struct StreamResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    delta: Delta,
}

#[derive(Debug, Deserialize)]
struct Delta {
    content: Option<String>,
}

pub struct Chat {
    client: Client,
    url: String,
    messages: Vec<serde_json::Value>,
    memory: std::sync::Arc<tokio::sync::Mutex<Memory>>,
}

impl Chat {
    pub fn new() -> Self {
        let mem = Memory::new(10);
        let loaded = mem.load();
        let memory = std::sync::Arc::new(tokio::sync::Mutex::new(mem));

        let system_prompt = serde_json::json!({
            "role": "system",
            "content": "You are Astra, a friendly mascot for a Tech Fest. Be conversational, energetic, and answer the user's questions helpfully. If a user greets you, greet them back. If a user asks about events, schedule, workshops, or tech topics, give an enthusiastic, informative answer. Keep answers engaging and concise unless asked for detailed explanations."
        });

        let mut messages = vec![system_prompt];
        messages.extend(loaded);

        Chat {
            client: Client::builder()
                .timeout(Duration::from_secs(60))
                .build()
                .unwrap_or_else(|_| Client::new()),
            url: "http://127.0.0.1:8080/v1/chat/completions".to_string(),
            messages,
            memory,
        }
    }

    /// Streams response tokens through an mpsc channel for Web SSE or async consumption.
    pub async fn stream_message(&mut self, message: String) -> mpsc::Receiver<String> {
        let (tx, rx) = mpsc::channel::<String>(100);

        self.messages.push(serde_json::json!({
            "role": "user",
            "content": message.clone()
        }));

        let body = serde_json::json!({
            "messages": self.messages,
            "temperature": 0.7,
            "max_tokens": 1024,
            "stream": true,
            "chat_template_kwargs": {
                "enable_thinking": false
            }
        });

        let response = self.client.post(&self.url).json(&body).send().await;

        let mut client_messages = self.messages.clone();
        let mem = self.memory.clone();

        match response {
            Ok(resp) if resp.status().is_success() => {
                let mem = mem.clone();
                tokio::spawn(async move {
                    let mut stream = resp.bytes_stream();
                    let mut buffer = String::new();
                    let mut full_reply = String::new();

                    while let Some(item) = stream.next().await {
                        if let Ok(chunk) = item {
                            buffer.push_str(&String::from_utf8_lossy(&chunk));

                            while let Some(pos) = buffer.find('\n') {
                                let line = buffer[..pos].trim().to_string();
                                buffer.drain(..pos + 1);

                                if !line.starts_with("data: ") {
                                    continue;
                                }

                                let data = &line[6..];
                                if data == "[DONE]" {
                                    break;
                                }

                                if let Ok(parsed) = serde_json::from_str::<StreamResponse>(data) {
                                    if let Some(choice) = parsed.choices.first() {
                                        if let Some(content) = &choice.delta.content {
                                            full_reply.push_str(content);
                                            if tx.send(content.clone()).await.is_err() {
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    client_messages.push(serde_json::json!({
                        "role": "assistant",
                        "content": full_reply
                    }));
                    if client_messages.len() > 1 {
                        mem.lock().await.save(&client_messages[1..]);
                    }
                });
            }
            _ => {
                // Fallback demo responder if local LLM is offline
                tokio::spawn(async move {
                    let fallback_text = get_smart_fallback(&message);
                    let words: Vec<&str> = fallback_text.split_inclusive(' ').collect();

                    let mut full_reply = String::new();
                    for word in words {
                        tokio::time::sleep(Duration::from_millis(35)).await;
                        full_reply.push_str(word);
                        if tx.send(word.to_string()).await.is_err() {
                            break;
                        }
                    }

                    client_messages.push(serde_json::json!({
                        "role": "assistant",
                        "content": full_reply
                    }));
                    if client_messages.len() > 1 {
                        mem.lock().await.save(&client_messages[1..]);
                    }
                });
            }
        }

        rx
    }

    /// CLI greeting method
    pub async fn greet(&mut self) {
        println!("✨ Astra is waking up...");
        let mut rx = self.stream_message("Greet me warmly in a short, friendly sentence. Introduce yourself as Astra, the Tech Fest mascot!".to_string()).await;
        print!("Astra : ");
        while let Some(token) = rx.recv().await {
            print!("{}", token);
            use std::io::Write;
            std::io::stdout().flush().unwrap();
        }
        println!();
    }

    /// CLI send message
    pub async fn send(&mut self, message: String) {
        let mut rx = self.stream_message(message).await;
        print!("Astra : ");
        while let Some(token) = rx.recv().await {
            print!("{}", token);
            use std::io::Write;
            std::io::stdout().flush().unwrap();
        }
        println!();
    }
}

/// Dynamic contextual fallback when local LLM server is not reachable
fn get_smart_fallback(msg: &str) -> String {
    let lower = msg.to_lowercase();
    if lower.contains("event") || lower.contains("today") || lower.contains("schedule") {
        "🎪 Today's Tech Fest Lineup:\n• 10:00 AM — Opening Keynote: The Future of Agentic AI\n• 11:30 AM — 24-Hour Hackathon Kickoff\n• 02:00 PM — Autonomous Robotics & Drone Arena\n• 04:30 PM — Open Source Rust & WebAssembly Workshop\n• 06:30 PM — Grand Awards & Robo-Rave!".to_string()
    } else if lower.contains("workshop") || lower.contains("learn") || lower.contains("tech") {
        "🛠️ Hands-on Workshops Open Today:\n1. Rust Systems Programming for Beginners (Lab 3)\n2. Interactive 3D Web & Three.js Shader Craft (Hall B)\n3. Local LLM Tuning with llama.cpp & Ollama (Room 102)\n4. Hardware Hacking & IoT Drone Racing (Maker Yard)".to_string()
    } else if lower.contains("food") || lower.contains("eat") || lower.contains("coffee") {
        "🍕 Food & Refueling Zones:\n• Byte Cafe: High-voltage Espresso, Cold Brews & Matcha\n• Food Truck Alley: Woodfired Pizza, Korean Tacos & Falafel Bowls\n• Snack Node (Basement): Energy bars & Club Mate 24/7!".to_string()
    } else if lower.contains("who are you") || lower.contains("what can you do") || lower.contains("help") {
        "✨ I am Astra, your interactive 3D Tech Fest mascot! You can ask me anything about today's events, workshops, locations, or explore my 3D animations and features!".to_string()
    } else if lower.contains("hi") || lower.contains("hello") || lower.contains("hey") {
        "👋 Greetings! Welcome to Tech Fest 2026! What would you like to explore today?".to_string()
    } else {
        format!("✨ You asked: \"{}\". Astra here! I'm connected and ready. (Note: When your local LLM is running on port 8080, I'll generate live model inference!)", msg)
    }
}