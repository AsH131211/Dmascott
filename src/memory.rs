use serde_json::Value;
use std::fs;
use std::path::PathBuf;

const HISTORY_FILE: &str = "data/chat_history.json";

pub struct Memory {
    path: PathBuf,
    max_history: usize,
}

impl Memory {
    pub fn new(max_history: usize) -> Self {
        let path = PathBuf::from(HISTORY_FILE);

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }

        Memory { path, max_history }
    }

    pub fn load(&self) -> Vec<Value> {
        match fs::read_to_string(&self.path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Vec::new(),
        }
    }

    pub fn save(&self, messages: &[Value]) {
        let trimmed: &[Value] = if messages.len() > self.max_history {
            &messages[messages.len() - self.max_history..]
        } else {
            messages
        };

        let json = serde_json::to_string_pretty(trimmed).unwrap_or_default();
        fs::write(&self.path, json).ok();
    }
}
