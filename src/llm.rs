use futures_util::StreamExt;
use reqwest::Client;
use serde::Deserialize;

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
}

impl Chat {
    pub fn new() -> Self {
        let messages = vec![
            serde_json::json!({
                "role": "system",
                "content": "You are Astra, a mascot for a Tech Fest. You are friendly and helpful."
            }),
        ];

        Chat {
            client: Client::new(),
            url: "http://127.0.0.1:8080/v1/chat/completions".to_string(),
            messages,
        }
    }

    pub async fn greet(&mut self) {
        // Temporarily add a greeting prompt
        self.messages.push(serde_json::json!({
            "role": "user",
            "content": "Greet me warmly in a short, friendly way. Introduce yourself as Astra."
        }));

        let body = serde_json::json!({
            "messages": self.messages,
            "temperature": 0.7,
            "max_tokens": 200,
            "stream": true,
            "chat_template_kwargs": {
                "enable_thinking": false
            }
        });

        let response = self.client
            .post(&self.url)
            .json(&body)
            .send()
            .await
            .unwrap();

        print!("Astra : ");

        let reply = stream_response(response).await;

        // Remove the fake user prompt and store the assistant reply
        self.messages.pop();
        self.messages.push(serde_json::json!({
            "role": "assistant",
            "content": reply
        }));
    }

    pub async fn send(&mut self, message: String) {
        self.messages.push(serde_json::json!({
            "role": "user",
            "content": message
        }));

        let body = serde_json::json!({
            "messages": self.messages,
            "temperature": 0.7,
            "max_tokens": 1000,
            "stream": true,
            "chat_template_kwargs": {
                "enable_thinking": false
            }
        });

        let response = self.client
            .post(&self.url)
            .json(&body)
            .send()
            .await
            .unwrap();

        print!("Astra : ");

        let reply = stream_response(response).await;

        self.messages.push(serde_json::json!({
            "role": "assistant",
            "content": reply
        }));
    }
}

async fn stream_response(response: reqwest::Response) -> String {
    use std::io::Write;

    let mut stream = response.bytes_stream();

    let mut buffer = String::new();
    let mut full_reply = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.unwrap();

        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(position) = buffer.find('\n') {
            let line = buffer[..position].trim().to_string();

            buffer.drain(..position + 1);

            if !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..];

            if data == "[DONE]" {
                println!();
                std::io::stdout().flush().unwrap();
                return full_reply;
            }

            let parsed: StreamResponse = match serde_json::from_str(data) {
                Ok(value) => value,
                Err(_) => continue,
            };

            if let Some(choice) = parsed.choices.first() {
                if let Some(content) = &choice.delta.content {
                    print!("{}", content);
                    std::io::stdout().flush().unwrap();
                    full_reply.push_str(content);
                }
            }
        }
    }

    println!();
    full_reply
}