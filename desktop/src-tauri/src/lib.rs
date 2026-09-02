use serde::Serialize;
use std::fs;
use std::path::PathBuf;

mod dpapi;

#[derive(Debug, Serialize)]
struct PersistResult {
    path: String,
}

fn shop_db_path(org_id: &str) -> Result<PathBuf, String> {
    let base = dirs_next::data_dir().ok_or("Could not resolve AppData")?;
    let dir = base.join("ProjectZ").join(org_id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("shop.db"))
}

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    let mut i = 0;
    while i < bytes.len() {
        let b0 = bytes[i];
        let b1 = if i + 1 < bytes.len() { bytes[i + 1] } else { 0 };
        let b2 = if i + 2 < bytes.len() { bytes[i + 2] } else { 0 };
        out.push(TABLE[(b0 >> 2) as usize] as char);
        out.push(TABLE[(((b0 & 3) << 4) | (b1 >> 4)) as usize] as char);
        if i + 1 < bytes.len() {
            out.push(TABLE[(((b1 & 15) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if i + 2 < bytes.len() {
            out.push(TABLE[(b2 & 63) as usize] as char);
        } else {
            out.push('=');
        }
        i += 3;
    }
    out
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    fn val(c: u8) -> Result<u8, String> {
        match c {
            b'A'..=b'Z' => Ok(c - b'A'),
            b'a'..=b'z' => Ok(c - b'a' + 26),
            b'0'..=b'9' => Ok(c - b'0' + 52),
            b'+' => Ok(62),
            b'/' => Ok(63),
            _ => Err("Invalid base64".into()),
        }
    }
    let cleaned: Vec<u8> = input
        .bytes()
        .filter(|b| !b.is_ascii_whitespace() && *b != b'=')
        .collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < cleaned.len() {
        let v0 = val(cleaned[i])?;
        let v1 = if i + 1 < cleaned.len() {
            val(cleaned[i + 1])?
        } else {
            0
        };
        let v2 = if i + 2 < cleaned.len() {
            val(cleaned[i + 2])?
        } else {
            0
        };
        let v3 = if i + 3 < cleaned.len() {
            val(cleaned[i + 3])?
        } else {
            0
        };
        out.push((v0 << 2) | (v1 >> 4));
        if i + 2 < cleaned.len() {
            out.push((v1 << 4) | (v2 >> 2));
        }
        if i + 3 < cleaned.len() {
            out.push((v2 << 6) | v3);
        }
        i += 4;
    }
    let pad = input.chars().filter(|c| *c == '=').count();
    if pad == 1 {
        out.pop();
    } else if pad == 2 {
        out.pop();
        out.pop();
    }
    Ok(out)
}

#[tauri::command]
fn persist_shop_db(org_id: String) -> Result<PersistResult, String> {
    let path = shop_db_path(&org_id)?;
    Ok(PersistResult {
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn save_shop_db(org_id: String, data_base64: String) -> Result<PersistResult, String> {
    let path = shop_db_path(&org_id)?;
    let bytes = decode_base64(&data_base64)?;
    let protected = dpapi::protect(&bytes)?;
    fs::write(&path, protected).map_err(|e| e.to_string())?;
    Ok(PersistResult {
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn load_shop_db(org_id: String) -> Result<Option<String>, String> {
    let path = shop_db_path(&org_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let stored = fs::read(&path).map_err(|e| e.to_string())?;
    if stored.is_empty() {
        return Ok(None);
    }
    let plain = dpapi::unprotect(&stored)?;
    if plain.is_empty() {
        return Ok(None);
    }
    Ok(Some(encode_base64(&plain)))
}

#[tauri::command]
fn list_shop_orgs() -> Result<Vec<String>, String> {
    let base = dirs_next::data_dir().ok_or("Could not resolve AppData")?;
    let root = base.join("ProjectZ");
    if !root.exists() {
        return Ok(vec![]);
    }
    let mut orgs = Vec::new();
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().join("shop.db").is_file() {
            if let Some(name) = entry.file_name().to_str() {
                orgs.push(name.to_string());
            }
        }
    }
    Ok(orgs)
}

#[tauri::command]
fn local_data_dir() -> Result<String, String> {
    let base = dirs_next::data_dir().ok_or("Could not resolve AppData")?;
    Ok(base.join("ProjectZ").to_string_lossy().to_string())
}

fn native_tokens_path() -> Result<PathBuf, String> {
    let base = dirs_next::data_dir().ok_or("Could not resolve AppData")?;
    let dir = base.join("ProjectZ");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("native-session.dat"))
}

#[tauri::command]
fn save_native_tokens(payload: String) -> Result<(), String> {
    let path = native_tokens_path()?;
    let protected = dpapi::protect(payload.as_bytes())?;
    fs::write(&path, protected).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_native_tokens() -> Result<Option<String>, String> {
    let path = native_tokens_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let stored = fs::read(&path).map_err(|e| e.to_string())?;
    if stored.is_empty() {
        return Ok(None);
    }
    let plain = dpapi::unprotect(&stored)?;
    Ok(Some(String::from_utf8(plain).map_err(|e| e.to_string())?))
}

#[tauri::command]
fn clear_native_tokens() -> Result<(), String> {
    let path = native_tokens_path()?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            persist_shop_db,
            save_shop_db,
            load_shop_db,
            list_shop_orgs,
            local_data_dir,
            save_native_tokens,
            load_native_tokens,
            clear_native_tokens
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
