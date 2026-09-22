use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::info;

const FACES_FILE: &str = "data/known_faces.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaceEntry {
    pub name: String,
    pub descriptor: Vec<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaceRegisterRequest {
    pub name: String,
    pub descriptor: Vec<f64>,
}

pub struct FaceStore {
    path: PathBuf,
    faces: Vec<FaceEntry>,
}

impl FaceStore {
    pub fn new() -> Self {
        let path = PathBuf::from(FACES_FILE);

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }

        let faces = Self::load_from_disk(&path);
        if !faces.is_empty() {
            info!(
                "FaceStore: loaded {} face(s) → [{}]",
                faces.len(),
                faces.iter().map(|f| f.name.as_str()).collect::<Vec<_>>().join(", ")
            );
        }
        FaceStore { path, faces }
    }

    fn load_from_disk(path: &PathBuf) -> Vec<FaceEntry> {
        match fs::read_to_string(path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Vec::new(),
        }
    }

    pub fn list(&self) -> &[FaceEntry] {
        &self.faces
    }

    pub fn register(&mut self, name: String, descriptor: Vec<f64>) -> Result<(), String> {
        if name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        if descriptor.len() != 128 {
            return Err(format!(
                "Descriptor must have 128 values, got {}",
                descriptor.len()
            ));
        }

        let is_update = self.faces.iter().any(|f| f.name == name);
        self.faces.retain(|f| f.name != name);
        self.faces.push(FaceEntry {
            name: name.clone(),
            descriptor,
        });
        self.save_to_disk();

        if is_update {
            info!("FaceStore: updated face \"{}\"", name);
        } else {
            info!("FaceStore: registered new face \"{}\"", name);
        }
        Ok(())
    }

    fn save_to_disk(&self) {
        match serde_json::to_string_pretty(&self.faces) {
            Ok(json) => {
                if let Err(e) = fs::write(&self.path, &json) {
                    eprintln!("FaceStore: failed to save to disk: {}", e);
                }
            }
            Err(e) => eprintln!("FaceStore: failed to serialize: {}", e),
        }
    }
}
