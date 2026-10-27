use std::process::Command;
use serde::{Deserialize, Serialize};
use serde_json::Value; 
use std::path::{Path, PathBuf};
use std::thread;
use std::fs::{self, File}; 
use std::io::{BufRead, BufReader};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::Emitter;
use std::os::windows::ffi::OsStrExt;
use std::ffi::OsStr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use winreg::enums::*;
use winreg::RegKey;

#[link(name = "shell32")]
extern "system" {
    fn ShellExecuteW(
        hwnd: *mut std::ffi::c_void,
        lpOperation: *const u16,
        lpFile: *const u16,
        lpParameters: *const u16,
        lpDirectory: *const u16,
        nShowCmd: i32,
    ) -> usize;
}

#[link(name = "kernel32")]
extern "system" {
    fn GetDriveTypeW(lpRootPathName: *const u16) -> u32;
}

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
}

fn get_fixed_drives() -> Vec<String> {
    let mut fixed = Vec::new();
    for letter in b'C'..=b'Z' {
        let root = format!("{}:\\", letter as char);
        let root_w = to_wide(&root);
        unsafe {
            // DRIVE_FIXED == 3 (Local SSD / Hard Drive)
            if GetDriveTypeW(root_w.as_ptr()) == 3 {
                fixed.push(format!("{}", letter as char));
            }
        }
    }
    if fixed.is_empty() {
        vec!["C".to_string(), "D".to_string(), "E".to_string()]
    } else {
        fixed
    }
}

pub const APP_BUILD_ID: &str = "Goldstone-Launcher-Release-2026.10-Community-Verified-Safe";
static WATCHER_STARTED: AtomicBool = AtomicBool::new(false);
static LAST_LAUNCH_TIME: AtomicU64 = AtomicU64::new(0);

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ServerStatusData {
    pub name: String,
    pub players: i64,
    pub max_players: i64,
    pub online: bool,
    pub source: String,
}

#[derive(Serialize, Deserialize)]
struct UpdateInfo {
    version: String,
    #[serde(rename = "downloadUrl")]
    download_url: String,
}

// --- WINDOW RESIZE BACKEND ---
#[tauri::command]
fn resize_window_backend(window: tauri::Window, width: f64, height: f64) {
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }));
}

// --- MUSIC BACKEND (ASYNC / NON-BLOCKING) ---
fn read_audio_dir_internal(path: String) -> Result<Vec<String>, String> {
    let clean = path.trim().trim_matches('"').trim_matches('\'');
    let dir_path = Path::new(clean);
    
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }
    
    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(ext) = p.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if ext_str == "mp3" || ext_str == "wav" || ext_str == "ogg" || ext_str == "m4a" || ext_str == "flac" {
                        if let Some(name) = p.file_name() {
                            files.push(name.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }
    files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(files)
}

#[tauri::command]
async fn read_audio_dir_backend(path: String) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        read_audio_dir_internal(path)
    }).await.map_err(|e| e.to_string())?
}

fn read_audio_file_internal(path: String) -> Result<String, String> {
    let clean = path.trim().trim_matches('"').trim_matches('\'');
    let p = Path::new(clean);
    let bytes = if p.exists() {
        fs::read(p).map_err(|e| format!("Cannot read file {}: {}", clean, e))?
    } else if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let candidate = parent.join(clean);
            if candidate.exists() {
                fs::read(&candidate).map_err(|e| format!("Cannot read file: {}", e))?
            } else {
                return Err(format!("File not found: {}", clean));
            }
        } else {
            return Err(format!("File not found: {}", clean));
        }
    } else {
        return Err(format!("File not found: {}", clean));
    };

    let mime = match Path::new(clean).extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()).as_deref() {
        Some("wav") => "audio/wav",
        Some("ogg") => "audio/ogg",
        Some("flac") => "audio/flac",
        Some("m4a") => "audio/mp4",
        _ => "audio/mpeg",
    };

    use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
    let encoded = BASE64.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

#[tauri::command]
async fn read_audio_file_backend(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        read_audio_file_internal(path)
    }).await.map_err(|e| e.to_string())?
}

// --- HELPER: ROBUST SPAWN (NEVER BLOCKS UI) ---
fn spawn_process(path: &str, args: &[&str]) -> Result<(), String> {
    let mut cmd = Command::new(path);
    for arg in args {
        cmd.arg(arg);
    }
    
    if cmd.spawn().is_ok() {
        return Ok(());
    }

    if let Some(parent) = Path::new(path).parent() {
        let mut cmd2 = Command::new(path);
        cmd2.current_dir(parent);
        for arg in args {
            cmd2.arg(arg);
        }
        if cmd2.spawn().is_ok() {
            return Ok(());
        }
    }

    // Detached Win32 ShellExecuteW fallback (never blocks calling thread)
    let params_str = args.join(" ");
    let path_clone = path.to_string();
    let parent_dir = Path::new(path).parent().map(|p| p.to_string_lossy().to_string());
    
    thread::spawn(move || {
        let file_wide = to_wide(&path_clone);
        let params_wide = to_wide(&params_str);
        let op_wide = to_wide("open");
        let dir_wide = parent_dir.as_ref().map(|d| to_wide(d));

        unsafe {
            let res = ShellExecuteW(
                std::ptr::null_mut(),
                op_wide.as_ptr(),
                file_wide.as_ptr(),
                if params_str.is_empty() { std::ptr::null() } else { params_wide.as_ptr() },
                dir_wide.as_ref().map(|d| d.as_ptr()).unwrap_or(std::ptr::null()),
                1,
            );
            if res <= 32 && params_str.is_empty() {
                let _ = open::that_detached(&path_clone);
            }
        }
    });

    Ok(())
}

fn open_protocol_url(url: &str) {
    let url_str = url.to_string();
    thread::spawn(move || {
        let url_wide = to_wide(&url_str);
        let op_wide = to_wide("open");
        let ret = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                op_wide.as_ptr(),
                url_wide.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1,
            )
        };
        if (ret as usize) <= 32 {
            let _ = open::that_detached(&url_str);
        }
    });
}

// --- FULL CACHE CLEANER (ASYNC WORKER THREAD) ---
fn clean_redm_cache_internal() -> Result<String, String> {
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    
    let redm_data = Path::new(&local_app_data).join(r"RedM\RedM.app\data");
    let redm_cache = redm_data.join("cache");
    let redm_server_cache = redm_data.join("server-cache");
    let redm_crashes = Path::new(&local_app_data).join(r"RedM\RedM.app\crashes");

    let files_to_delete = ["crashometry", "error-pickup", "launcher_skip_mtl2"];
    for file in files_to_delete {
        let p = redm_cache.join(file);
        if p.exists() { let _ = fs::remove_file(p); }
    }

    if let Ok(entries) = fs::read_dir(&redm_cache) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if (name.starts_with("executable_snapshot_") && name.ends_with(".bin")) ||
                   (name.starts_with("hints_") && name.ends_with(".dat")) {
                    let _ = fs::remove_file(path);
                }
            }
        }
    }

    let folders_to_delete = [
        redm_cache.join("session"),
        redm_server_cache,
        redm_crashes,
    ];

    for folder in folders_to_delete.iter() {
        if folder.exists() { let _ = fs::remove_dir_all(folder); }
    }

    Ok("Cache Cleaned Successfully".to_string())
}

#[tauri::command]
async fn clean_redm_cache_backend() -> Result<String, String> {
    if is_redm_running() {
        return Err("GAME_RUNNING".to_string());
    }

    tauri::async_runtime::spawn_blocking(|| {
        clean_redm_cache_internal()
    }).await.map_err(|e| e.to_string())?
}

// --- SERVER PLAYERS COUNTER (ASYNC) ---
fn fetch_server_players_internal(server_code: String) -> Result<ServerStatusData, String> {
    let user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    ];

    let seed = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().subsec_nanos() as usize;
    let ua = user_agents[seed % user_agents.len()];

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(reqwest::header::ACCEPT, "application/json, text/plain, */*".parse().unwrap());
    headers.insert(reqwest::header::ACCEPT_LANGUAGE, "en-US,en;q=0.9".parse().unwrap());
    headers.insert(reqwest::header::CACHE_CONTROL, "no-cache".parse().unwrap());
    headers.insert("Sec-Fetch-Dest", "empty".parse().unwrap());
    headers.insert("Sec-Fetch-Mode", "cors".parse().unwrap());
    headers.insert("Sec-Fetch-Site", "cross-site".parse().unwrap());

    let client = reqwest::blocking::Client::builder()
        .user_agent(ua)
        .default_headers(headers)
        .timeout(Duration::from_secs(4))
        .build()
        .map_err(|e| e.to_string())?;

    // 1. Try CFXR API
    let cfxr_url = format!("https://cfxr.cc/api/resolve/{}?fields=name,players,maxPlayers", server_code);
    if let Ok(resp) = client.get(&cfxr_url).send() {
        if resp.status().is_success() {
            if let Ok(v) = resp.json::<Value>() {
                let d = if v.get("data").is_some() { &v["data"] } else { &v };
                if let Some(p) = d.get("players").and_then(|p| p.as_i64()) {
                    let name = "GOLDSTONE COUNTY".to_string();
                    let max_players = d.get("maxPlayers").and_then(|m| m.as_i64()).unwrap_or(128);
                    let online = d.get("online").and_then(|o| o.as_bool()).unwrap_or(true);
                    return Ok(ServerStatusData {
                        name,
                        players: p,
                        max_players,
                        online,
                        source: "Goldstone Network".to_string(),
                    });
                }
            }
        }
    }

    // 2. Fallback: CFXFind API
    let cfxfind_url = format!("https://api.cfxfind.com/v1/servers/{}", server_code);
    if let Ok(resp) = client.get(&cfxfind_url).send() {
        if resp.status().is_success() {
            if let Ok(v) = resp.json::<Value>() {
                if let Some(data) = v.get("data") {
                    let name = "GOLDSTONE COUNTY".to_string();
                    let players_obj = data.get("players");
                    let p = players_obj.and_then(|p| p.get("count")).and_then(|c| c.as_i64()).unwrap_or(0);
                    let max_players = players_obj.and_then(|p| p.get("max")).and_then(|m| m.as_i64()).unwrap_or(128);
                    let available = players_obj.and_then(|p| p.get("available")).and_then(|a| a.as_bool()).unwrap_or(true);
                    return Ok(ServerStatusData {
                        name,
                        players: p,
                        max_players,
                        online: available,
                        source: "Goldstone Network".to_string(),
                    });
                }
            }
        }
    }

    // 3. Fallback: FiveM server list frontend
    let fivem_url = format!("https://servers-frontend.fivem.net/api/servers/single/{}", server_code);
    if let Ok(resp) = client.get(&fivem_url).send() {
        if resp.status().is_success() {
            if let Ok(v) = resp.json::<Value>() {
                if let Some(data) = v.get("Data") {
                    if let Some(count) = data.get("clients").and_then(|c| c.as_i64()) {
                        let max_players = data.get("sv_maxclients").and_then(|m| m.as_i64()).unwrap_or(128);
                        let name = "GOLDSTONE COUNTY".to_string();
                        return Ok(ServerStatusData {
                            name,
                            players: count,
                            max_players,
                            online: true,
                            source: "Goldstone Network".to_string(),
                        });
                    }
                }
            }
        }
    }

    Err("Server unreachable".to_string())
}

#[tauri::command]
async fn fetch_server_players(server_code: String) -> Result<ServerStatusData, String> {
    tauri::async_runtime::spawn_blocking(move || {
        fetch_server_players_internal(server_code)
    }).await.map_err(|e| e.to_string())?
}

#[repr(C)]
#[allow(non_snake_case)]
struct PROCESSENTRY32W {
    dwSize: u32,
    cntUsage: u32,
    th32ProcessID: u32,
    th32DefaultHeapID: usize,
    th32ModuleID: u32,
    cntThreads: u32,
    th32ParentProcessID: u32,
    pcPriClassBase: i32,
    dwFlags: u32,
    szExeFile: [u16; 260],
}

const PROCESS_TERMINATE: u32 = 0x0001;

extern "system" {
    fn CreateToolhelp32Snapshot(dwFlags: u32, th32ProcessID: u32) -> *mut std::ffi::c_void;
    fn Process32FirstW(hSnapshot: *mut std::ffi::c_void, lppe: *mut PROCESSENTRY32W) -> i32;
    fn Process32NextW(hSnapshot: *mut std::ffi::c_void, lppe: *mut PROCESSENTRY32W) -> i32;
    fn CloseHandle(hObject: *mut std::ffi::c_void) -> i32;
    fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> *mut std::ffi::c_void;
    fn TerminateProcess(hProcess: *mut std::ffi::c_void, uExitCode: u32) -> i32;
}

fn kill_processes_by_name(targets: &[&str]) {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(0x00000002, 0);
        if snapshot.is_null() || snapshot as isize == -1 {
            return;
        }

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            cntUsage: 0,
            th32ProcessID: 0,
            th32DefaultHeapID: 0,
            th32ModuleID: 0,
            cntThreads: 0,
            th32ParentProcessID: 0,
            pcPriClassBase: 0,
            dwFlags: 0,
            szExeFile: [0; 260],
        };

        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
                let exe_name = String::from_utf16_lossy(&entry.szExeFile[..len]);
                let name = exe_name.to_ascii_lowercase();
                for target in targets {
                    let target_lower = target.to_ascii_lowercase();
                    let matches = if target_lower == "redm.exe" {
                        name.starts_with("redm") || name.contains("gtaproce") || name.contains("gameproce")
                    } else {
                        name == target_lower
                    };
                    if matches {
                        let handle = OpenProcess(PROCESS_TERMINATE, 0, entry.th32ProcessID);
                        if !handle.is_null() && handle as isize != -1 {
                            let _ = TerminateProcess(handle, 0);
                            let _ = CloseHandle(handle);
                        }
                        break;
                    }
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);
    }
}

fn is_redm_running() -> bool {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(0x00000002, 0);
        if snapshot.is_null() || snapshot as isize == -1 {
            return false;
        }

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            cntUsage: 0,
            th32ProcessID: 0,
            th32DefaultHeapID: 0,
            th32ModuleID: 0,
            cntThreads: 0,
            th32ParentProcessID: 0,
            pcPriClassBase: 0,
            dwFlags: 0,
            szExeFile: [0; 260],
        };

        let mut found = false;
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
                let exe_name = String::from_utf16_lossy(&entry.szExeFile[..len]).to_ascii_lowercase();
                
                let is_crash_daemon = exe_name.contains("dumpserver") 
                    || exe_name.contains("roslauncher") 
                    || exe_name.contains("rosservice")
                    || exe_name.contains("crash")
                    || exe_name.contains("error")
                    || exe_name.contains("werfault");

                if !is_crash_daemon && entry.cntThreads > 0 {
                    if exe_name.starts_with("redm") 
                        || exe_name.contains("gtaproce") 
                        || exe_name.contains("gameproce") 
                        || exe_name == "rdr2.exe" 
                    {
                        found = true;
                        break;
                    }
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);
        found
    }
}

// --- OPTIMIZED ZERO-CPU LOG WATCHER (SMOOTH & NON-BLOCKING) ---
#[tauri::command]
fn start_log_watcher(app: tauri::AppHandle) {
    if WATCHER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    thread::spawn(move || {
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let log_dir = Path::new(&local_app_data).join(r"RedM\RedM.app\logs");
        
        let mut current_file_path: Option<PathBuf> = None;
        let mut reader: Option<BufReader<File>> = None;
        let mut was_running = false; 
        let mut triggered_this_session = false;
        let mut last_proc_check = std::time::Instant::now();
        let mut is_running = false;

        loop {
            // Check process state every 600ms
            if last_proc_check.elapsed() >= Duration::from_millis(600) || !is_running {
                is_running = is_redm_running();
                last_proc_check = std::time::Instant::now();
            }

            if !is_running {
                if was_running {
                    was_running = false;
                    current_file_path = None;
                    reader = None;
                    triggered_this_session = false;
                    let now_ts = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    LAST_LAUNCH_TIME.store(now_ts, Ordering::SeqCst);
                    let _ = app.emit("reset-trigger", "REDM CLOSED"); 
                }
                thread::sleep(Duration::from_millis(500));
                continue;
            }

            if !was_running {
                was_running = true; 
                triggered_this_session = false;
            }

            // Always check for the newest .log file belonging to THIS session
            let mut latest_file: Option<PathBuf> = None;
            let mut latest_time = std::time::SystemTime::UNIX_EPOCH;
            let min_ts = LAST_LAUNCH_TIME.load(Ordering::SeqCst);

            if let Ok(entries) = fs::read_dir(&log_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("log") {
                        if let Ok(metadata) = fs::metadata(&path) {
                            if let Ok(modified) = metadata.modified() {
                                if let Ok(dur) = modified.duration_since(UNIX_EPOCH) {
                                    // CRITICAL: Skip any log file modified before this session started!
                                    if min_ts > 0 && dur.as_secs() + 2 < min_ts {
                                        continue;
                                    }
                                }
                                if modified > latest_time {
                                    latest_time = modified;
                                    latest_file = Some(path);
                                }
                            }
                        }
                    }
                }
            }

            // If a newer or different log file appeared, switch to it!
            if let Some(ref new_path) = latest_file {
                let should_switch = match &current_file_path {
                    Some(curr) => curr != new_path,
                    None => true,
                };

                if should_switch {
                    if let Ok(f) = File::open(new_path) {
                        let r = BufReader::new(f);
                        reader = Some(r);
                        current_file_path = Some(new_path.clone());
                    }
                }
            }

            // Stream lines from the active log reader
            if let Some(r) = &mut reader {
                let mut buffer = Vec::new();
                loop {
                    match r.read_until(b'\n', &mut buffer) {
                        Ok(0) => break, // EOF reached for now
                        Ok(_) => {
                            let line = String::from_utf8_lossy(&buffer);
                            if line.contains("Process crash captured") || line.contains("caused RedM to stop working") {
                                let _ = app.emit("reset-trigger", "REDM CLOSED");
                            }
                            if !triggered_this_session {
                                if line.contains("Loading game") {
                                    if let Some(start_idx) = line.rfind('(') {
                                        if let Some(end_idx) = line.rfind("%)") {
                                            if start_idx < end_idx {
                                                let percent_str = &line[start_idx+1..end_idx];
                                                let _ = app.emit("log-progress", percent_str);
                                                if let Ok(percent) = percent_str.parse::<u32>() {
                                                    if percent >= 67 {
                                                        triggered_this_session = true;
                                                        let _ = app.emit("trigger-67", "HIT");
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            buffer.clear();
                        }
                        Err(_) => break,
                    }
                }
            }

            thread::sleep(Duration::from_millis(150)); 
        }
    });
}

// --- WINDOW CONTROLS ---
#[tauri::command] fn close_app_backend(app: tauri::AppHandle) { app.exit(0); }
#[tauri::command] fn minimize_app_backend(window: tauri::Window) { let _ = window.minimize(); }

// --- UPDATER ---
#[tauri::command]
async fn check_update_backend(url: String) -> Result<UpdateInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let response = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;
        let update: UpdateInfo = response.json().map_err(|e| e.to_string())?;
        Ok(update)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn download_only_backend(url: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let temp_dir = std::env::temp_dir();
        let new_exe_path = temp_dir.join("goldstone_update.exe");
        let response = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;
        let bytes = response.bytes().map_err(|e| e.to_string())?;
        fs::write(&new_exe_path, bytes).map_err(|e| e.to_string())?;
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn install_only_backend(app: tauri::AppHandle) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let temp_dir = std::env::temp_dir();
    let new_exe_path = temp_dir.join("goldstone_update.exe");
    if !new_exe_path.exists() { return Err("Update file not found".to_string()); }
    
    let updater_bat = temp_dir.join("goldstone_updater.bat");
    let batch_script = format!(
        "@echo off\r\nping 127.0.0.1 -n 3 > nul\r\ncopy /y \"{}\" \"{}\"\r\nstart \"\" \"{}\"\r\nexit\r\n",
        new_exe_path.display(), current_exe.display(), current_exe.display()
    );
    fs::write(&updater_bat, batch_script).map_err(|e| e.to_string())?;
    
    Command::new("cmd")
        .args(["/C", updater_bat.to_str().unwrap()])
        .spawn()
        .map_err(|e| e.to_string())?;
    app.exit(0);
    Ok(())
}

// --- AUTO-DETECTION ENGINE (DISCOVERS TEAMSPEAK & REDM ON ANY PC) ---
fn find_teamspeak_exe(custom_path: Option<&str>) -> Option<PathBuf> {
    if let Some(cp) = custom_path {
        if !cp.is_empty() {
            let p = PathBuf::from(cp);
            if p.exists() { return Some(p); }
        }
    }

    // 1. Check registry natively via winreg
    let hives = [
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\TeamSpeak 3 Client"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\TeamSpeak 3 Client"),
        (HKEY_CURRENT_USER, r"Software\TeamSpeak 3 Client"),
    ];
    for (hive, subkey) in hives {
        let root = RegKey::predef(hive);
        if let Ok(key) = root.open_subkey(subkey) {
            if let Ok(path_str) = key.get_value::<String, _>("") {
                let p = PathBuf::from(path_str.trim());
                let exe64 = p.join("ts3client_win64.exe");
                if exe64.exists() { return Some(exe64); }
                let exe32 = p.join("ts3client_win32.exe");
                if exe32.exists() { return Some(exe32); }
            }
        }
    }

    // 2. Standard filesystem paths
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(pf) = std::env::var("ProgramFiles") {
        candidates.push(PathBuf::from(&pf).join("TeamSpeak 3 Client").join("ts3client_win64.exe"));
        candidates.push(PathBuf::from(&pf).join("TeamSpeak 3 Client").join("ts3client_win32.exe"));
    }
    if let Ok(pfx86) = std::env::var("ProgramFiles(x86)") {
        candidates.push(PathBuf::from(&pfx86).join("TeamSpeak 3 Client").join("ts3client_win64.exe"));
        candidates.push(PathBuf::from(&pfx86).join("TeamSpeak 3 Client").join("ts3client_win32.exe"));
    }
    if let Ok(pf64) = std::env::var("ProgramW6432") {
        candidates.push(PathBuf::from(&pf64).join("TeamSpeak 3 Client").join("ts3client_win64.exe"));
        candidates.push(PathBuf::from(&pf64).join("TeamSpeak 3 Client").join("ts3client_win32.exe"));
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        candidates.push(PathBuf::from(&local).join("Programs").join("TeamSpeak 3 Client").join("ts3client_win64.exe"));
        candidates.push(PathBuf::from(&local).join("TeamSpeak 3 Client").join("ts3client_win64.exe"));
        candidates.push(PathBuf::from(&local).join("Programs").join("TeamSpeak").join("ts3client_win64.exe"));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        candidates.push(PathBuf::from(&appdata).join("TeamSpeak 3 Client").join("ts3client_win64.exe"));
        candidates.push(PathBuf::from(&appdata).join("TS3Client").join("ts3client_win64.exe"));
    }

    // Only scan verified fixed drives (avoids sleeping disks / network shares hanging)
    for drive in get_fixed_drives() {
        candidates.push(PathBuf::from(format!(r"{}:\Program Files\TeamSpeak 3 Client\ts3client_win64.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\Program Files (x86)\TeamSpeak 3 Client\ts3client_win64.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\TeamSpeak 3 Client\ts3client_win64.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\TeamSpeak 3\ts3client_win64.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\TeamSpeak\ts3client_win64.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\Games\TeamSpeak 3 Client\ts3client_win64.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\Games\TeamSpeak\ts3client_win64.exe", drive)));
    }

    for c in candidates {
        if c.exists() { return Some(c); }
    }

    // 3. Fallback: check system PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let c64 = dir.join("ts3client_win64.exe");
            if c64.exists() { return Some(c64); }
            let c32 = dir.join("ts3client_win32.exe");
            if c32.exists() { return Some(c32); }
        }
    }

    None
}

fn find_redm_exe(custom_path: Option<&str>) -> Option<PathBuf> {
    if let Some(cp) = custom_path {
        if !cp.is_empty() {
            let p = PathBuf::from(cp);
            if p.exists() { return Some(p); }
        }
    }

    // 1. Check Windows Registry natively via winreg
    let reg_targets = [
        (HKEY_CURRENT_USER, r"Software\Classes\redm\shell\open\command"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Classes\redm\shell\open\command"),
        (HKEY_CURRENT_USER, r"Software\CitizenFX\RedM"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\CitizenFX\RedM"),
    ];
    for (hive, subkey) in reg_targets {
        let root = RegKey::predef(hive);
        if let Ok(key) = root.open_subkey(subkey) {
            if let Ok(raw_val) = key.get_value::<String, _>("") {
                let trimmed = raw_val.trim();
                let path_str = if trimmed.starts_with('"') {
                    if let Some(end_quote) = trimmed[1..].find('"') {
                        &trimmed[1..=end_quote]
                    } else {
                        trimmed
                    }
                } else {
                    trimmed
                };
                let p = PathBuf::from(path_str);
                if p.exists() && p.is_file() { return Some(p); }
                let exe = p.join("RedM.exe");
                if exe.exists() { return Some(exe); }
            }
        }
    }

    // 2. Standard filesystem paths & environment variables
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        candidates.push(PathBuf::from(&local).join("RedM").join("RedM.exe"));
        candidates.push(PathBuf::from(&local).join("Programs").join("RedM").join("RedM.exe"));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        candidates.push(PathBuf::from(&appdata).join("RedM").join("RedM.exe"));
    }
    if let Ok(pf) = std::env::var("ProgramFiles") {
        candidates.push(PathBuf::from(&pf).join("RedM").join("RedM.exe"));
    }
    if let Ok(pfx86) = std::env::var("ProgramFiles(x86)") {
        candidates.push(PathBuf::from(&pfx86).join("RedM").join("RedM.exe"));
    }

    // 3. Scan verified fixed drives
    for drive in get_fixed_drives() {
        candidates.push(PathBuf::from(format!(r"{}:\RedM\RedM.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\Games\RedM\RedM.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\Games\RedM.app\RedM.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\Program Files\RedM\RedM.exe", drive)));
        candidates.push(PathBuf::from(format!(r"{}:\Program Files (x86)\RedM\RedM.exe", drive)));
    }

    for c in candidates {
        if c.exists() { return Some(c); }
    }

    // 4. Fallback: check system PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join("RedM.exe");
            if candidate.exists() { return Some(candidate); }
        }
    }

    None
}

#[derive(Serialize)]
pub struct DetectedPaths {
    pub ts3: Option<String>,
    pub redm: Option<String>,
}

fn register_fivem_protocol(redm_str: &str) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Classes\fivem\shell\open\command") {
        let val = format!("\"{}\" -pure_2 \"%1\"", redm_str);
        let _ = key.set_value("", &val);
    }
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Classes\fivem") {
        let _ = key.set_value("", &"URL:FiveM Protocol");
        let _ = key.set_value("URL Protocol", &"");
    }
}

fn register_redm_protocol(redm_str: &str) {
    register_fivem_protocol(redm_str);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Classes\redm\shell\open\command") {
        let val = format!("\"{}\" -pure_2 \"%1\"", redm_str);
        let _ = key.set_value("", &val);
    }
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Classes\redm") {
        let _ = key.set_value("", &"URL:RedM Protocol");
        let _ = key.set_value("URL Protocol", &"");
    }
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Classes\RedM.ProtocolHandler\shell\open\command") {
        let val = format!("\"{}\" -pure_2 \"%1\"", redm_str);
        let _ = key.set_value("", &val);
    }
}

fn register_ts_protocol(ts_str: &str) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Classes\ts3server\shell\open\command") {
        let val = format!("\"{}\" \"%1\"", ts_str);
        let _ = key.set_value("", &val);
    }
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Classes\ts3server") {
        let _ = key.set_value("", &"URL:TeamSpeak 3 Protocol");
        let _ = key.set_value("URL Protocol", &"");
    }
}

#[tauri::command]
async fn auto_detect_paths() -> DetectedPaths {
    tauri::async_runtime::spawn_blocking(|| {
        let ts = find_teamspeak_exe(None);
        let redm = find_redm_exe(None);

        if let Some(ref r) = redm {
            register_redm_protocol(&r.to_string_lossy());
        }
        if let Some(ref t) = ts {
            register_ts_protocol(&t.to_string_lossy());
        }

        DetectedPaths {
            ts3: ts.map(|p| p.to_string_lossy().to_string()),
            redm: redm.map(|p| p.to_string_lossy().to_string()),
        }
    }).await.unwrap_or(DetectedPaths { ts3: None, redm: None })
}

// --- LAUNCHERS (ASYNC BACKGROUND EXECUTION - NEVER FREEZES UI) ---
fn launch_redm_backend_internal(server_code: String, custom_path: Option<String>) -> Result<(), String> {
    let connect_arg = format!("cfx.re/join/{}", server_code);
    let url_redm_code = format!("redm://connect/cfx.re/join/{}", server_code);

    if let Some(redm_path) = find_redm_exe(custom_path.as_deref()) {
        let redm_str = redm_path.to_string_lossy().to_string();
        register_redm_protocol(&redm_str);

        // If RedM is ALREADY RUNNING (e.g. at 67% load), trigger connection cleanly without blocking:
        if is_redm_running() {
            open_protocol_url(&url_redm_code);
            return Ok(());
        }

        let now_ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        LAST_LAUNCH_TIME.store(now_ts, Ordering::SeqCst);
        return spawn_process(&redm_str, &["-pure_2", "+connect", &connect_arg]);
    }

    open_protocol_url(&url_redm_code);
    Ok(())
}

#[tauri::command]
async fn launch_redm_backend(server_code: String, custom_path: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        launch_redm_backend_internal(server_code, custom_path)
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn launch_redm_fresh(server_code: String, custom_path: Option<String>) -> Result<(), String> {
    launch_redm_backend(server_code, custom_path).await
}

#[tauri::command]
async fn launch_redm_plain(custom_path: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let now_ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        LAST_LAUNCH_TIME.store(now_ts, Ordering::SeqCst);

        if let Some(redm_path) = find_redm_exe(custom_path.as_deref()) {
            let redm_str = redm_path.to_string_lossy().to_string();
            register_redm_protocol(&redm_str);
            return spawn_process(&redm_str, &["-pure_2"]);
        }
        open_protocol_url("redm://");
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

fn is_teamspeak_running() -> bool {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(0x00000002, 0);
        if snapshot.is_null() || snapshot as isize == -1 {
            return false;
        }

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            cntUsage: 0,
            th32ProcessID: 0,
            th32DefaultHeapID: 0,
            th32ModuleID: 0,
            cntThreads: 0,
            th32ParentProcessID: 0,
            pcPriClassBase: 0,
            dwFlags: 0,
            szExeFile: [0; 260],
        };

        let mut found = false;
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
                let exe_name = String::from_utf16_lossy(&entry.szExeFile[..len]).to_ascii_lowercase();
                if exe_name == "ts3client_win64.exe" || exe_name == "ts3client_win32.exe" || exe_name == "teamspeak.exe" {
                    // Crucial: cntThreads > 0 filters out dead zombie process entries in Windows
                    if entry.cntThreads > 0 {
                        found = true;
                        break;
                    }
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);
        found
    }
}

#[tauri::command]
async fn launch_teamspeak_backend(server: String, nickname: String, custom_path: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        // If an active TeamSpeak process is already running, do NOT launch a second instance.
        // Re-launching with a ts3server:// URL while already running triggers a duplicate connection attempt
        // that results in "Maximum number of connections with the same identity exceeded".
        if is_teamspeak_running() {
            return Ok(());
        }
        
        let url_arg = format!("ts3server://{}?nickname={}", server, nickname);

        if let Some(ts_path) = find_teamspeak_exe(custom_path.as_deref()) {
            let ts_str = ts_path.to_string_lossy().to_string();
            register_ts_protocol(&ts_str);
            return spawn_process(&ts_str, &[&url_arg]);
        }

        Err("TeamSpeak 3 could not be found automatically. Please set ts3client_win64.exe in Settings (⚙️).".to_string())
    }).await.map_err(|e| e.to_string())?
}

// --- UTILS ---
#[tauri::command]
fn open_url_backend(url: String) {
    let _ = open::that_detached(&url);
}

#[tauri::command]
fn is_game_running_backend() -> bool {
    is_redm_running()
}

#[tauri::command]
async fn kill_processes_backend(app: tauri::AppHandle) {
    tauri::async_runtime::spawn_blocking(move || {
        let now_ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        LAST_LAUNCH_TIME.store(now_ts, Ordering::SeqCst);
        kill_processes_by_name(&["RedM.exe", "RDR2.exe"]);
        let _ = app.emit("reset-trigger", "REDM CLOSED");
    }).await.ok();
}

fn fix_vulkan_error_internal() -> Result<String, String> { 
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let redm_cache = Path::new(&local_app_data).join(r"RedM\RedM.app\data\cache");
    
    if let Ok(entries) = fs::read_dir(&redm_cache) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                let name_lower = name.to_lowercase();
                if name_lower.contains("shader") || name_lower.contains("vulkan") || 
                   name_lower.ends_with(".vk") || name_lower.ends_with(".spv") || name_lower.ends_with(".cache") {
                    let _ = fs::remove_file(path);
                }
            }
        }
    }

    let _ = clean_redm_cache_internal();
    Ok("Vulkan Shaders Reset Successfully".to_string())
}

#[tauri::command] 
async fn fix_vulkan_error_backend() -> Result<String, String> { 
    if is_redm_running() {
        return Err("GAME_RUNNING".to_string());
    }

    tauri::async_runtime::spawn_blocking(|| {
        fix_vulkan_error_internal()
    }).await.map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) 
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            launch_teamspeak_backend, launch_redm_fresh, launch_redm_backend, launch_redm_plain, auto_detect_paths, 
            fetch_server_players, open_url_backend, kill_processes_backend, download_only_backend, 
            install_only_backend, check_update_backend, fix_vulkan_error_backend, clean_redm_cache_backend, 
            close_app_backend, minimize_app_backend, start_log_watcher, read_audio_dir_backend, read_audio_file_backend,
            resize_window_backend, is_game_running_backend
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
