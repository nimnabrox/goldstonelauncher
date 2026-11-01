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
use std::os::windows::process::CommandExt;
const CREATE_NO_WINDOW: u32 = 0x08000000;



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



    fn LoadLibraryW(lpLibFileName: *const u16) -> *mut std::ffi::c_void;



    fn GetProcAddress(hModule: *mut std::ffi::c_void, lpProcName: *const u8) -> *mut std::ffi::c_void;



    fn FreeLibrary(hLibModule: *mut std::ffi::c_void) -> i32;



}







#[link(name = "user32")]



extern "system" {



    fn FindWindowW(lpClassName: *const u16, lpWindowName: *const u16) -> *mut std::ffi::c_void;



    fn PostMessageW(hWnd: *mut std::ffi::c_void, Msg: u32, wParam: usize, lParam: isize) -> i32;



    fn EnumWindows(lpEnumFunc: Option<unsafe extern "system" fn(*mut std::ffi::c_void, isize) -> i32>, lParam: isize) -> i32;



    fn GetWindowThreadProcessId(hWnd: *mut std::ffi::c_void, lpdwProcessId: *mut u32) -> u32;



    fn GetWindowTextW(hWnd: *mut std::ffi::c_void, lpString: *mut u16, nMaxCount: i32) -> i32;



    fn MapVirtualKeyW(uCode: u32, uMapType: u32) -> u32;



    fn GetAsyncKeyState(vKey: i32) -> i16;

    fn IsWindowVisible(hWnd: *mut std::ffi::c_void) -> i32;
}







unsafe extern "system" fn enum_win_close_overwolf_proc(hwnd: *mut std::ffi::c_void, _: isize) -> i32 {



    let mut title_buf = [0u16; 512];



    let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 512);



    if len > 0 {



        let title = String::from_utf16_lossy(&title_buf[..len as usize]);



        let lower = title.to_ascii_lowercase();



        if lower.contains("skin your ts3 overlay") 



            || (lower.contains("ts3") && lower.contains("overlay"))



            || lower.contains("overwolf overlay") {



            PostMessageW(hwnd, 0x0010 /* WM_CLOSE */, 0, 0);



        }



    }



    1



}







fn close_overwolf_overlay_windows() {



    unsafe {



        EnumWindows(Some(enum_win_close_overwolf_proc), 0);



    }



}















fn trigger_reshade_reload_live() {



    unsafe {



        let mut redm_pids: Vec<u32> = Vec::new();



        let snapshot = CreateToolhelp32Snapshot(0x00000002, 0);



        if !snapshot.is_null() && snapshot as isize != -1 {



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



                    let exe_name = String::from_utf16_lossy(&entry.szExeFile[..len]).to_ascii_lowercase();



                    if exe_name.starts_with("redm") 



                        || exe_name.contains("gtaproce") 



                        || exe_name.contains("gameproce") 



                        || exe_name == "rdr2.exe" 



                    {



                        redm_pids.push(entry.th32ProcessID);



                    }



                    if Process32NextW(snapshot, &mut entry) == 0 {



                        break;



                    }



                }



            }



            CloseHandle(snapshot);



        }







        struct EnumData {



            pids: Vec<u32>,



            hwnds: Vec<*mut std::ffi::c_void>,



        }







        unsafe extern "system" fn enum_win_proc(hwnd: *mut std::ffi::c_void, lparam: isize) -> i32 {



            let data = &mut *(lparam as *mut EnumData);



            let mut win_pid: u32 = 0;



            GetWindowThreadProcessId(hwnd, &mut win_pid);



            if data.pids.contains(&win_pid) {



                data.hwnds.push(hwnd);



            }



            1



        }







        let mut data = EnumData {



            pids: redm_pids,



            hwnds: Vec::new(),



        };







        EnumWindows(Some(enum_win_proc), &mut data as *mut EnumData as isize);







        let class_names = ["grcWindow", "sgaWindow", "rage::sysWindow", "RedM"];



        for c in &class_names {



            let cw = to_wide(c);



            let h = FindWindowW(cw.as_ptr(), std::ptr::null());



            if !h.is_null() && h as isize != -1 && !data.hwnds.contains(&h) {



                data.hwnds.push(h);



            }



        }



        let titles = ["RedM", "RedM by Cfx.re", "Red Dead Redemption 2"];



        for t in &titles {



            let tw = to_wide(t);



            let h = FindWindowW(std::ptr::null(), tw.as_ptr());



            if !h.is_null() && h as isize != -1 && !data.hwnds.contains(&h) {



                data.hwnds.push(h);



            }



        }







        const WM_KEYDOWN: u32 = 0x0100;



        const WM_KEYUP: u32 = 0x0101;



        let keys_to_send: [u32; 2] = [0x13 /* VK_PAUSE */, 0x7C /* VK_F13 */];







        for &vk in &keys_to_send {



            let scan = MapVirtualKeyW(vk, 0); // MAPVK_VK_TO_VSC



            let lparam_down: isize = 1 | ((scan as isize) << 16);



            let lparam_up: isize = 1 | ((scan as isize) << 16) | (1 << 30) | (1 << 31);







            for &hwnd in &data.hwnds {



                PostMessageW(hwnd, WM_KEYDOWN, vk as usize, lparam_down);



                PostMessageW(hwnd, WM_KEYUP, vk as usize, lparam_up);



            }



        }



    }



}







fn sync_reshade_key_to_game_memory_live(key_code: u32) {
    unsafe {
        let local_app_data = match std::env::var("LOCALAPPDATA") {
            Ok(v) => std::path::PathBuf::from(v),
            Err(_) => return,
        };
        let sub_dir = local_app_data.join(r"RedM\RedM.app\data\cache\subprocess");
        if !sub_dir.exists() {
            return;
        }

        // 1. Gather all ReShade.log* sorted by modification time
        let mut logs: Vec<(std::path::PathBuf, std::time::SystemTime)> = Vec::new();
        if let Ok(entries) = std::fs::read_dir(&sub_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                    if name.starts_with("ReShade") && name.contains(".log") {
                        if let Ok(meta) = entry.metadata() {
                            if let Ok(mtime) = meta.modified() {
                                logs.push((p, mtime));
                            }
                        }
                    }
                }
            }
        }
        logs.sort_by(|a, b| b.1.cmp(&a.1));

        // 2. Extract candidate runtime pointer(s)
        let mut runtime_ptrs: Vec<usize> = Vec::new();
        for (log_path, _) in &logs {
            if let Ok(content) = std::fs::read_to_string(log_path) {
                for line in content.lines() {
                    if let Some(idx) = line.find("Recreated runtime environment on runtime ") {
                        let rem = &line[idx + 41..];
                        let hex_str: String = rem.chars().take_while(|c| c.is_ascii_hexdigit()).collect();
                        if let Ok(ptr_val) = usize::from_str_radix(&hex_str, 16) {
                            if ptr_val > 0 && !runtime_ptrs.contains(&ptr_val) {
                                runtime_ptrs.push(ptr_val);
                            }
                        }
                    }
                }
            }
        }

        if runtime_ptrs.is_empty() {
            return;
        }

        // 3. Find running RedM GTA process IDs
        let mut redm_pids: Vec<u32> = Vec::new();
        let snapshot = CreateToolhelp32Snapshot(0x00000002, 0);
        if !snapshot.is_null() && snapshot as isize != -1 {
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
                    let exe_name = String::from_utf16_lossy(&entry.szExeFile[..len]).to_ascii_lowercase();
                    if exe_name.contains("gtaproce")
                        || exe_name.contains("gameproce")
                        || exe_name.starts_with("redm")
                        || exe_name == "rdr2.exe"
                    {
                        redm_pids.push(entry.th32ProcessID);
                    }
                    if Process32NextW(snapshot, &mut entry) == 0 {
                        break;
                    }
                }
            }
            CloseHandle(snapshot);
        }

        // 4. Update memory for each matching process and verified runtime object
        const PROCESS_ALL_ACCESS: u32 = 0x1F0FFF;
        const RUNTIME_EFFECTS_KEY_OFFSET: usize = 0x94;
        const RUNTIME_RELOAD_KEY_OFFSET: usize = 0xd8;

        for pid in redm_pids {
            let h_proc = OpenProcess(PROCESS_ALL_ACCESS, 0, pid);
            if h_proc.is_null() || h_proc as isize == -1 {
                continue;
            }

            for &runtime_ptr in &runtime_ptrs {
                // Verify runtime signature: _reload_key_data at +0xd8 == 19 (VK_PAUSE)
                let mut reload_buf = [0u32; 4];
                let mut bytes_read: usize = 0;
                let res = ReadProcessMemory(
                    h_proc,
                    (runtime_ptr + RUNTIME_RELOAD_KEY_OFFSET) as *const std::ffi::c_void,
                    reload_buf.as_mut_ptr() as *mut std::ffi::c_void,
                    16,
                    &mut bytes_read,
                );

                if res != 0 && reload_buf[0] == 19 {
                    // Verified ReShade runtime! Write new key data [key_code, 0, 0, 0] to +0x94
                    let new_key_data = [key_code, 0u32, 0u32, 0u32];
                    let mut bytes_written: usize = 0;
                    WriteProcessMemory(
                        h_proc,
                        (runtime_ptr + RUNTIME_EFFECTS_KEY_OFFSET) as *mut std::ffi::c_void,
                        new_key_data.as_ptr() as *const std::ffi::c_void,
                        16,
                        &mut bytes_written,
                    );
                }
            }

            CloseHandle(h_proc);
        }
    }
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







#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]



pub struct SongItem {



    pub id: String,



    pub title: String,



    pub filename: String,



    pub url: String,



}







#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]



pub struct SyncedSongItem {



    pub id: String,



    pub title: String,



    pub filename: String,



    pub local_path: String,



    pub is_downloaded: bool,



}







#[derive(serde::Serialize, Clone, Debug)]



pub struct SongDownloadProgress {



    pub song_id: String,



    pub title: String,



    pub progress: u32,



    pub downloaded_bytes: u64,



    pub total_bytes: u64,



}







fn get_music_dir() -> PathBuf {



    if let Ok(appdata) = std::env::var("APPDATA") {



        let p = PathBuf::from(appdata).join(r"GoldstoneLauncher\Goldstone Launcher Music");



        let _ = fs::create_dir_all(&p);



        return p;



    }



    let temp = std::env::temp_dir().join("GoldstoneLauncher_Music");



    let _ = fs::create_dir_all(&temp);



    temp



}







#[tauri::command]



async fn get_music_folder_backend() -> Result<String, String> {



    Ok(get_music_dir().to_string_lossy().to_string())



}







#[tauri::command]



async fn sync_music_songs_backend(app: tauri::AppHandle, songs: Vec<SongItem>) -> Result<Vec<SyncedSongItem>, String> {



    tauri::async_runtime::spawn_blocking(move || {



        let music_dir = get_music_dir();



        let mut synced_list = Vec::new();



        let mut expected_filenames = std::collections::HashSet::new();







        for song in &songs {



            expected_filenames.insert(song.filename.to_lowercase());



            let target_file = music_dir.join(&song.filename);



            let already_cached = if target_file.exists() {



                if let Ok(meta) = fs::metadata(&target_file) {



                    meta.len() > 10_000



                } else {



                    false



                }



            } else {



                false



            };







            if already_cached {



                synced_list.push(SyncedSongItem {



                    id: song.id.clone(),



                    title: song.title.clone(),



                    filename: song.filename.clone(),



                    local_path: target_file.to_string_lossy().to_string(),



                    is_downloaded: true,



                });



                continue;



            }







            // Convert Dropbox dl=0 to direct download dl=1



            let mut dl_url = song.url.clone();



            if dl_url.contains("dropbox.com") && dl_url.contains("dl=0") {



                dl_url = dl_url.replace("dl=0", "dl=1");



            }







            let song_id = song.id.clone();



            let song_title = song.title.clone();



            let app_clone = app.clone();







            use tauri::Emitter;



            let _ = download_file_with_progress(&dl_url, &target_file, move |downloaded, total| {



                let pct = if total > 0 { ((downloaded as f64 / total as f64) * 100.0).min(100.0) as u32 } else { 0 };



                let _ = app_clone.emit("music-download-progress", SongDownloadProgress {



                    song_id: song_id.clone(),



                    title: song_title.clone(),



                    progress: pct,



                    downloaded_bytes: downloaded,



                    total_bytes: total,



                });



            });







            let final_exists = target_file.exists() && fs::metadata(&target_file).map(|m| m.len() > 10_000).unwrap_or(false);







            synced_list.push(SyncedSongItem {



                id: song.id.clone(),



                title: song.title.clone(),



                filename: song.filename.clone(),



                local_path: target_file.to_string_lossy().to_string(),



                is_downloaded: final_exists,



            });



        }







        // Clean up any unlisted songs if removed from manifest



        if let Ok(entries) = fs::read_dir(&music_dir) {



            for entry in entries.flatten() {



                let p = entry.path();



                if p.is_file() {



                    if let Some(ext) = p.extension() {



                        if ext.to_string_lossy().to_lowercase() == "mp3" {



                            if let Some(fname) = p.file_name() {



                                let name_lower = fname.to_string_lossy().to_lowercase();



                                if !expected_filenames.contains(&name_lower) {



                                    let _ = fs::remove_file(&p);



                                }



                            }



                        }



                    }



                }



            }



        }







        Ok(synced_list)



    }).await.map_err(|e| e.to_string())?



}







fn get_voice_urls() -> (String, String) {



    let mut ts3_url = "https://files.teamspeak-services.com/releases/client/3.6.2/TeamSpeak3-Client-win64-3.6.2.exe".to_string();



    let mut salty_url = "https://saltyhub.net/download/4.1.0".to_string();







    // 1. Fetch remote GitHub config/voice.json dynamically



    if let Ok(client) = reqwest::blocking::Client::builder().timeout(Duration::from_millis(2500)).build() {



        let urls = [



            "https://raw.githubusercontent.com/nimnabrox/goldstonelauncher/main/config/voice.json",



            "https://raw.githubusercontent.com/nimnabrox/goldstonelauncher/main/voice.json",



        ];



        for u in urls {



            if let Ok(resp) = client.get(u).send() {



                if resp.status().is_success() {



                    if let Ok(val) = resp.json::<serde_json::Value>() {



                        if let Some(ts_u) = val.get("teamspeak").and_then(|t| t.get("downloadUrl")).and_then(|u| u.as_str()) {



                            ts3_url = ts_u.to_string();



                        }



                        if let Some(sc_u) = val.get("saltychat").and_then(|s| s.get("downloadUrl")).and_then(|u| u.as_str()) {



                            salty_url = sc_u.to_string();



                        }



                        return (ts3_url, salty_url);



                    }



                }



            }



        }



    }







    // 2. Fallback to local config/voice.json, voice.json, or version.json



    let mut candidates = Vec::new();



    candidates.push(PathBuf::from(r"config\voice.json"));



    candidates.push(PathBuf::from("voice.json"));



    candidates.push(PathBuf::from("version.json"));



    if let Ok(exe) = std::env::current_exe() {



        if let Some(parent) = exe.parent() {



            candidates.push(parent.join(r"config\voice.json"));



            candidates.push(parent.join("voice.json"));



            candidates.push(parent.join("version.json"));



        }



    }







    for path in candidates {



        if path.exists() {



            if let Ok(content) = fs::read_to_string(&path) {



                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {



                    if let Some(ts_u) = val.get("teamspeak").and_then(|t| t.get("downloadUrl")).and_then(|u| u.as_str()) {



                        ts3_url = ts_u.to_string();



                    }



                    if let Some(sc_u) = val.get("saltychat").and_then(|s| s.get("downloadUrl")).and_then(|u| u.as_str()) {



                        salty_url = sc_u.to_string();



                    }



                    if let Some(voice) = val.get("voice") {



                        if let Some(ts_u) = voice.get("teamspeak").and_then(|t| t.get("downloadUrl")).and_then(|u| u.as_str()) {



                            ts3_url = ts_u.to_string();



                        }



                        if let Some(sc_u) = voice.get("saltychat").and_then(|s| s.get("downloadUrl")).and_then(|u| u.as_str()) {



                            salty_url = sc_u.to_string();



                        }



                    }



                }



            }



        }



    }







    (ts3_url, salty_url)



}







#[tauri::command]



async fn get_voice_config_backend() -> Result<serde_json::Value, String> {



    tauri::async_runtime::spawn_blocking(|| {



        let (ts3_url, salty_url) = get_voice_urls();



        Ok(serde_json::json!({



            "teamspeak": {



                "version": "3.6.2",



                "name": "TeamSpeak 3 Client (64-bit)",



                "downloadUrl": ts3_url



            },



            "saltychat": {



                "version": "4.1.0",



                "name": "SaltyChat Plugin",



                "downloadUrl": salty_url



            }



        }))



    }).await.map_err(|e| e.to_string())?



}











// --- HELPER: ROBUST SPAWN (NEVER BLOCKS UI) ---



fn spawn_gui_process(path: &str, args: &[&str]) -> Result<(), String> {
    let parent = Path::new(path).parent();
    let params_str = args.join(" ");
    let parent_dir = parent.map(|p| p.to_string_lossy().to_string());

    let file_wide = to_wide(path);
    let params_wide = to_wide(&params_str);
    let op_wide = to_wide("open");
    let dir_wide = parent_dir.as_ref().map(|d| to_wide(d));

    unsafe {
        let res = ShellExecuteW(
            std::ptr::null_mut(),
            op_wide.as_ptr(),
            file_wide.as_ptr(),
            if args.is_empty() { std::ptr::null() } else { params_wide.as_ptr() },
            dir_wide.as_ref().map(|d| d.as_ptr()).unwrap_or(std::ptr::null()),
            1, // SW_SHOWNORMAL: Always create/show the interactive GUI window on screen
        );
        if res as usize > 32 {
            return Ok(());
        }
    }

    let mut cmd = Command::new(path);
    if let Some(p) = parent {
        cmd.current_dir(p);
    }
    for arg in args {
        cmd.arg(arg);
    }
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[allow(dead_code)]
fn spawn_process(path: &str, args: &[&str]) -> Result<(), String> {
    let parent = Path::new(path).parent();
    let mut cmd = Command::new(path);
    if let Some(p) = parent {
        cmd.current_dir(p);
    }
    cmd.creation_flags(CREATE_NO_WINDOW);
    for arg in args {
        cmd.arg(arg);
    }
    if cmd.spawn().is_ok() {
        return Ok(());
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



            let _res = ShellExecuteW(



                std::ptr::null_mut(),



                op_wide.as_ptr(),



                file_wide.as_ptr(),



                if params_str.is_empty() { std::ptr::null() } else { params_wide.as_ptr() },



                dir_wide.as_ref().map(|d| d.as_ptr()).unwrap_or(std::ptr::null()),



                1,



            );



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







    // Note: Do NOT delete hints_*.dat or session folder! Those store Rockstar Social Club auth tokens.



    let folders_to_delete = [



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







#[allow(dead_code)]
const PROCESS_TERMINATE: u32 = 0x0001;







extern "system" {



    fn CreateToolhelp32Snapshot(dwFlags: u32, th32ProcessID: u32) -> *mut std::ffi::c_void;



    fn Process32FirstW(hSnapshot: *mut std::ffi::c_void, lppe: *mut PROCESSENTRY32W) -> i32;



    fn Process32NextW(hSnapshot: *mut std::ffi::c_void, lppe: *mut PROCESSENTRY32W) -> i32;



    fn CloseHandle(hObject: *mut std::ffi::c_void) -> i32;

    fn WaitNamedPipeW(lpNamedPipeName: *const u16, nTimeOut: u32) -> i32;

    fn CreateFileW(
        lpFileName: *const u16,
        dwDesiredAccess: u32,
        dwShareMode: u32,
        lpSecurityAttributes: *mut std::ffi::c_void,
        dwCreationDisposition: u32,
        dwFlagsAndAttributes: u32,
        hTemplateFile: *mut std::ffi::c_void,
    ) -> *mut std::ffi::c_void;

    fn WriteFile(
        hFile: *mut std::ffi::c_void,
        lpBuffer: *const u8,
        nNumberOfBytesToWrite: u32,
        lpNumberOfBytesWritten: *mut u32,
        lpOverlapped: *mut std::ffi::c_void,
    ) -> i32;



    fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> *mut std::ffi::c_void;
    fn ReadProcessMemory(hProcess: *mut std::ffi::c_void, lpBaseAddress: *const std::ffi::c_void, lpBuffer: *mut std::ffi::c_void, nSize: usize, lpNumberOfBytesRead: *mut usize) -> i32;
    fn WriteProcessMemory(hProcess: *mut std::ffi::c_void, lpBaseAddress: *mut std::ffi::c_void, lpBuffer: *const std::ffi::c_void, nSize: usize, lpNumberOfBytesWritten: *mut usize) -> i32;



    fn TerminateProcess(hProcess: *mut std::ffi::c_void, uExitCode: u32) -> i32;
    fn WaitForSingleObject(hHandle: *mut std::ffi::c_void, dwMilliseconds: u32) -> u32;



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



                    } else if target_lower == "overwolf" || target_lower.starts_with("overwolf") {
                        name.contains("overwolf") || name.contains("owclient") || name.contains("owexplorer") || name.contains("owhelper")



                    } else {



                        name == target_lower



                    };



                    if matches {



                        let handle = OpenProcess(0x00100001, 0, entry.th32ProcessID);
                        if !handle.is_null() && handle as isize != -1 {
                            let _ = TerminateProcess(handle, 0);
                            let _ = WaitForSingleObject(handle, 1500);
                            let _ = CloseHandle(handle);
                        } else {
                            let _ = Command::new("taskkill")
                                .args(&["/F", "/T", "/PID", &entry.th32ProcessID.to_string()])
                                .creation_flags(CREATE_NO_WINDOW)
                                .output();
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







fn is_process_running_fuzzy(pattern: &str) -> bool {



    let pat_lower = pattern.to_ascii_lowercase();



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



                if exe_name.contains(&pat_lower) {



                    found = true;



                    break;



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



                    if let Ok(mut f) = File::open(new_path) {



                        use std::io::Seek;



                        let _ = f.seek(std::io::SeekFrom::End(0));



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
        .creation_flags(CREATE_NO_WINDOW)
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



        silence_teamspeak_notifications();



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




fn ensure_goldstone_reshade_configured(custom_toggle_vk: Option<u32>) {
    let mut candidate_sub_dirs = Vec::new();
    if let Some(sub) = get_redm_subprocess_dir() {
        candidate_sub_dirs.push(sub);
    }
    if let Some(redm_exe) = find_redm_exe(None) {
        if let Some(parent) = redm_exe.parent() {
            candidate_sub_dirs.push(parent.join(r"RedM.app\data\cache\subprocess"));
            candidate_sub_dirs.push(parent.join(r"data\cache\subprocess"));
        }
    }

    for sub_dir in candidate_sub_dirs {
        if !sub_dir.exists() { continue; }
        let has_reshade = sub_dir.join("dxgi.dll").exists() 
            || sub_dir.join("ReShade64.dll").exists() 
            || sub_dir.join("ReShade.ini").exists();
        if !has_reshade { continue; }

        let preset_name = "Goldstone Enhanced (SZ).ini";
        let preset_path = sub_dir.join(preset_name);
        let _ = fs::write(&preset_path, GOLDSTONE_PRESET_INI);
        let _ = fs::write(sub_dir.join("ReShadePreset.ini"), GOLDSTONE_PRESET_INI);

        if let Some(parent_app) = sub_dir.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
            let _ = fs::write(parent_app.join(preset_name), GOLDSTONE_PRESET_INI);
            let _ = fs::write(parent_app.join("ReShadePreset.ini"), GOLDSTONE_PRESET_INI);
        }

        let ini_path = sub_dir.join("ReShade.ini");
        let mut toggle_key = custom_toggle_vk.unwrap_or(118);
        if custom_toggle_vk.is_none() && ini_path.exists() {
            if let Ok(c) = fs::read_to_string(&ini_path) {
                for line in c.lines() {
                    if line.trim().starts_with("KeyEffects=") {
                        if let Some(val) = line.split('=').nth(1) {
                            if let Some(first) = val.split(',').next() {
                                if let Ok(k) = first.trim().parse::<u32>() {
                                    if k > 0 { toggle_key = k; }
                                }
                            }
                        }
                    }
                }
            }
        }

        let abs_shaders = sub_dir.join(r"reshade-shaders\Shaders").to_string_lossy().to_string();
        let abs_textures = sub_dir.join(r"reshade-shaders\Textures").to_string_lossy().to_string();
        let abs_preset = preset_path.to_string_lossy().to_string();

        let mut lines: Vec<String> = Vec::new();
        let mut in_general = false;
        let mut in_input = false;
        let mut general_keys_seen = std::collections::HashSet::new();
        let mut input_keys_seen = std::collections::HashSet::new();

        if ini_path.exists() {
            if let Ok(content) = fs::read_to_string(&ini_path) {
                for line in content.lines() {
                    let s = line.trim();
                    if s.starts_with('[') && s.ends_with(']') {
                        if in_general {
                            if !general_keys_seen.contains("CurrentPresetPath") {
                                lines.push(format!("CurrentPresetPath={}", abs_preset));
                            }
                            if !general_keys_seen.contains("PresetPath") {
                                lines.push(format!("PresetPath={}", abs_preset));
                            }
                            if !general_keys_seen.contains("StartupPresetPath") {
                                lines.push(format!("StartupPresetPath={}", abs_preset));
                            }
                            if !general_keys_seen.contains("PresetFiles") {
                                lines.push(format!("PresetFiles={}", abs_preset));
                            }
                            if !general_keys_seen.contains("CurrentPreset") {
                                lines.push("CurrentPreset=0".to_string());
                            }
                            if !general_keys_seen.contains("EffectSearchPaths") {
                                lines.push(format!("EffectSearchPaths={},.\\reshade-shaders\\Shaders,reshade-shaders\\Shaders,.\\", abs_shaders));
                            }
                            if !general_keys_seen.contains("TextureSearchPaths") {
                                lines.push(format!("TextureSearchPaths={},.\\reshade-shaders\\Textures,reshade-shaders\\Textures,.\\", abs_textures));
                            }
                            in_general = false;
                        }
                        if in_input {
                            if !input_keys_seen.contains("KeyEffects") {
                                lines.push(format!("KeyEffects={},0,0,0", toggle_key));
                            }
                            if !input_keys_seen.contains("KeyReload") {
                                lines.push("KeyReload=19,0,0,0".to_string());
                            }
                            if !input_keys_seen.contains("KeyOverlay") {
                                lines.push("KeyOverlay=36,0,0,0".to_string());
                            }
                            if !input_keys_seen.contains("InputProcessing") {
                                lines.push("InputProcessing=2".to_string());
                            }
                            in_input = false;
                        }

                        if s.eq_ignore_ascii_case("[GENERAL]") {
                            in_general = true;
                        } else if s.eq_ignore_ascii_case("[INPUT]") {
                            in_input = true;
                        }
                    }

                    if in_general {
                        let k = s.split('=').next().unwrap_or("").trim();
                        if matches!(k, "CurrentPresetPath" | "PresetPath" | "StartupPresetPath" | "PresetFiles") {
                            lines.push(format!("{}={}", k, abs_preset));
                            general_keys_seen.insert(k.to_string());
                            continue;
                        } else if k == "EffectSearchPaths" {
                            lines.push(format!("EffectSearchPaths={},.\\reshade-shaders\\Shaders,reshade-shaders\\Shaders,.\\", abs_shaders));
                            general_keys_seen.insert(k.to_string());
                            continue;
                        } else if k == "TextureSearchPaths" {
                            lines.push(format!("TextureSearchPaths={},.\\reshade-shaders\\Textures,reshade-shaders\\Textures,.\\", abs_textures));
                            general_keys_seen.insert(k.to_string());
                            continue;
                        } else if k == "CurrentPreset" {
                            lines.push("CurrentPreset=0".to_string());
                            general_keys_seen.insert(k.to_string());
                            continue;
                        }
                    } else if in_input {
                        let k = s.split('=').next().unwrap_or("").trim();
                        if k == "KeyEffects" {
                            lines.push(format!("KeyEffects={},0,0,0", toggle_key));
                            input_keys_seen.insert(k.to_string());
                            continue;
                        } else if k == "KeyReload" {
                            lines.push("KeyReload=19,0,0,0".to_string());
                            input_keys_seen.insert(k.to_string());
                            continue;
                        }
                    }

                    lines.push(line.to_string());
                }
            }
        }

        if lines.is_empty() {
            let fresh = format!(r#"[GENERAL]
CurrentPresetPath={}
PresetPath={}
StartupPresetPath={}
PresetFiles={}
CurrentPreset=0
EffectSearchPaths={},.\reshade-shaders\Shaders,reshade-shaders\Shaders,.\
TextureSearchPaths={},.\reshade-shaders\Textures,reshade-shaders\Textures,.\
IntermediateCachePath=.\reshade-shaders\Intermediate
PerformanceMode=0
NoReloadOnInit=0
PreprocessorDefinitions=FXAA_LINEAR_LIGHT=1,INFINITE_BOUNCES=1,SKYCOLOR_MODE=10,MATERIAL_TYPE=1,MXAO_MIPLEVEL_AO=1,MXAO_TWO_LAYER=1,MXAO_ENHANCED_FADE=1

[INPUT]
KeyMenu=36,0,0,0
KeyOverlay=36,0,0,0
KeyEffects={},0,0,0
KeyReload=19,0,0,0
InputProcessing=2

[OVERLAY]
TutorialProgress=4
"#, abs_preset, abs_preset, abs_preset, abs_preset, abs_shaders, abs_textures, toggle_key);
            let _ = fs::write(&ini_path, fresh);
        } else {
            if in_general {
                if !general_keys_seen.contains("CurrentPresetPath") {
                    lines.push(format!("CurrentPresetPath={}", abs_preset));
                }
                if !general_keys_seen.contains("PresetPath") {
                    lines.push(format!("PresetPath={}", abs_preset));
                }
                if !general_keys_seen.contains("StartupPresetPath") {
                    lines.push(format!("StartupPresetPath={}", abs_preset));
                }
                if !general_keys_seen.contains("PresetFiles") {
                    lines.push(format!("PresetFiles={}", abs_preset));
                }
            }
            let _ = fs::write(&ini_path, lines.join("\n"));
        }
    }
}

fn launch_redm_backend_internal(server_code: String, custom_path: Option<String>) -> Result<(), String> {



    ensure_goldstone_reshade_configured(None);




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



        return spawn_gui_process(&redm_str, &["-pure_2", "+connect", &connect_arg]);



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



            return spawn_gui_process(&redm_str, &["-pure_2"]);



        }



        open_protocol_url("redm://");



        Ok(())



    }).await.map_err(|e| e.to_string())?



}








unsafe extern "system" fn enum_ts3_window_proc(hwnd: *mut std::ffi::c_void, lparam: isize) -> i32 {
    let p_state = lparam as *mut (u32, bool);
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, &mut pid);
    if pid == (*p_state).0 {
        if IsWindowVisible(hwnd) != 0 {
            (*p_state).1 = true;
            return 0; // Found visible top-level window, stop enumeration
        }
    }
    1
}

fn kill_headless_ts3_zombies() {
    send_to_goldstone_pipe("EXIT_TS3");
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(0x00000002, 0);
        if !snapshot.is_null() && snapshot as isize != -1 {
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
                    let exe_name = String::from_utf16_lossy(&entry.szExeFile[..len]).to_ascii_lowercase();
                    if exe_name == "ts3client_win64.exe" || exe_name == "ts3client_win32.exe" || exe_name == "teamspeak.exe" {
                        let pid = entry.th32ProcessID;
                        if entry.cntThreads > 0 {
                            let mut state = (pid, false);
                            EnumWindows(Some(enum_ts3_window_proc), &mut state as *mut (u32, bool) as isize);
                            if !state.1 {
                                // Headless zombie with 0 visible windows! Terminate it immediately
                                let h_proc = OpenProcess(0x0001, 0, pid);
                                if !h_proc.is_null() {
                                    TerminateProcess(h_proc, 0);
                                    CloseHandle(h_proc);
                                }
                            }
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



                    if entry.cntThreads > 4 {
                        let mut state = (entry.th32ProcessID, false);
                        EnumWindows(Some(enum_ts3_window_proc), &mut state as *mut (u32, bool) as isize);
                        if state.1 {
                            found = true;
                            break;
                        }
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









fn copy_dir_recursive(src: &Path, dst: &Path) {



    if let Ok(entries) = fs::read_dir(src) {



        for entry in entries.flatten() {



            let p = entry.path();



            if let Some(name) = p.file_name() {



                let target = dst.join(name);



                if p.is_dir() {



                    let _ = fs::create_dir_all(&target);



                    copy_dir_recursive(&p, &target);



                } else {



                    let _ = fs::copy(&p, &target);



                }



            }



        }



    }



}







fn ensure_saltychat_settings(salty_dir: &Path) {
    let _ = fs::create_dir_all(salty_dir);
    let settings_file = salty_dir.join("settings.json");
    let default_settings = r#"{
  "WebSocketAddress": "127.0.0.1:38088",
  "UpdateBranch": "Stable",
  "AccptedTerms300": true,
  "AcceptedTerms400": true,
  "OriginExceptions": [
    "^http:\/\/resource$",
    "^(?:(?!http).)*$"
  ],
  "InstanceTimeout": 6,
  "Is3dEnabled": true,
  "ExpertMode": false,
  "LogLevel": "Info",
  "PhoneOffset": "Stereo",
  "RadioOffset": "Stereo",
  "SecondaryRadioOffset": "Stereo",
  "MicClickMode": "ScriptDependent",
  "SeenSmotdIds": [],
  "PersistentFingerprint": "",
  "VerifiedServers": {}
}"#;

    let needs_write = if !settings_file.exists() {
        true
    } else if let Ok(s) = fs::read_to_string(&settings_file) {
        !s.contains("38088") || !s.contains("AcceptedTerms400")
    } else {
        true
    };

    if needs_write {
        let _ = fs::write(&settings_file, default_settings);
    }
}

fn deploy_saltychat_plugin(app: Option<&tauri::AppHandle>, dest_dirs: &[PathBuf]) -> Result<bool, String> {



    // 1. Check local TS3_AutoSetup folder first (fast local dev / offline)



    let mut candidates = Vec::new();



    candidates.push(PathBuf::from(r"TS3_AutoSetup\TS3Config\plugins"));



    candidates.push(PathBuf::from(r"TS3_AutoSetup\plugins"));



    if let Ok(exe) = std::env::current_exe() {



        if let Some(parent) = exe.parent() {



            candidates.push(parent.join(r"TS3_AutoSetup\TS3Config\plugins"));



            candidates.push(parent.join(r"TS3_AutoSetup\plugins"));



        }



    }







    let mut copied_local = false;



    for src in &candidates {



        let dll = src.join("SaltyChat_win64.dll");



        if dll.exists() {



            for dest in dest_dirs {



                let _ = fs::create_dir_all(dest);



                let _ = fs::copy(&dll, dest.join("SaltyChat_win64.dll"));



                let sub_src = src.join("SaltyChat");



                let sub_dest = dest.join("SaltyChat");



                let _ = fs::create_dir_all(&sub_dest);



                let _ = copy_dir_recursive(&sub_src, &sub_dest);



            }



            copied_local = true;



            break;



        }



    }







    if copied_local {
        for d in dest_dirs {
            ensure_saltychat_settings(&d.join("SaltyChat"));
        }
        if let Ok(appdata) = std::env::var("APPDATA") {
            ensure_saltychat_settings(&PathBuf::from(appdata).join(r"TS3Client\plugins\SaltyChat"));
        }
        return Ok(true);
    }







    // 2. Download from official SaltyHub URL (dynamic from voice config)



    let (_, dyn_salty_url) = get_voice_urls();



    let download_url = dyn_salty_url.as_str();



    let temp_zip = std::env::temp_dir().join("SaltyChat_4.1.0.ts3_plugin");







    let app_opt = app.cloned();



    let dl_res = download_file_with_progress(download_url, &temp_zip, move |downloaded, total| {



        if let Some(ref a) = app_opt {



            let pct = if total > 0 { ((downloaded as f64 / total as f64) * 100.0).min(100.0) as u32 } else { 0 };



            emit_ts3_prog(a, 60 + (pct * 20 / 100), &format!("DOWNLOADING SALTYCHAT v4.1.0 ({}%)...", pct), "Downloading official 3D spatial audio plugin...");



        }



    });







    if dl_res.is_err() || !temp_zip.exists() {



        return Err("Failed to download SaltyChat from official server".to_string());



    }







    // Unzip plugins/ from archive to dest_dirs



    if let Ok(zip_file) = fs::File::open(&temp_zip) {



        if let Ok(mut archive) = zip::ZipArchive::new(zip_file) {



            for i in 0..archive.len() {



                if let Ok(mut file) = archive.by_index(i) {



                    if let Some(enclosed) = file.enclosed_name() {



                        let name_str = enclosed.to_string_lossy().replace('\\', "/");



                        if name_str.starts_with("plugins/") {



                            let rel = &name_str["plugins/".len()..];



                            if rel.is_empty() { continue; }



                            for dest in dest_dirs {



                                let outpath = dest.join(rel);



                                if file.is_dir() {



                                    let _ = fs::create_dir_all(&outpath);



                                } else {



                                    if let Some(p) = outpath.parent() {



                                        let _ = fs::create_dir_all(p);



                                    }



                                    if let Ok(mut outfile) = fs::File::create(&outpath) {



                                        let _ = std::io::copy(&mut file, &mut outfile);



                                    }



                                }



                            }



                        }



                    }



                }



            }



        }



    }







    let _ = fs::remove_file(&temp_zip);
    for d in dest_dirs { ensure_saltychat_settings(&d.join("SaltyChat")); }
    if let Ok(appdata) = std::env::var("APPDATA") { ensure_saltychat_settings(&PathBuf::from(appdata).join(r"TS3Client\plugins\SaltyChat")); }
    Ok(true)



}







fn write_teamspeak_addons_ini(ts3_dir: &Path) {



    let addons_path = ts3_dir.join("addons.ini");



    let content = "[plugin]\r\nSalty%20Chat\\enabled=true\r\nGoldstone%20PTT%20Controller\\enabled=true\r\nGoldstone%20PTT%20Controller\\files=goldstone_ptt_win64.dll\r\nSalty%20Chat\\files=SaltyChat/default/enterRadioChannel.wav, SaltyChat/default/leaveRadioChannel.wav, SaltyChat/default/offMicClick.wav, SaltyChat/default/offSecMicClick.wav, SaltyChat/default/onMicClick.wav, SaltyChat/default/onSecMicClick.wav, SaltyChat/default/phoneBusytone.wav, SaltyChat/default/phoneDialtone.wav, SaltyChat/default/phoneMessagetone.wav, SaltyChat/default/phoneRingtone.wav, SaltyChat/default/phoneVibration.wav, SaltyChat/default/radioAlarm.wav, SaltyChat/default/radioOff.wav, SaltyChat/default/radioOn.wav, SaltyChat/default/selfOffMicClick.wav, SaltyChat/default/selfOnMicClick.wav, SaltyChat/override/readme.txt, SaltyChat/settings-example.json, SaltyChat/VoiceDistortion_win64.dll, SaltyChat_win64.dll, SaltyChat_win64.pdb\r\n";



    let _ = fs::write(&addons_path, content);



}







fn check_user_has_overwolf() -> bool {
    // 1. Check known executable files
    let mut check_paths = Vec::new();
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        check_paths.push(PathBuf::from(&local).join(r"Overwolf\Overwolf.exe"));
        check_paths.push(PathBuf::from(&local).join(r"Overwolf\OverwolfLauncher.exe"));
    }
    if let Ok(pfx86) = std::env::var("ProgramFiles(x86)") {
        check_paths.push(PathBuf::from(&pfx86).join(r"Overwolf\Overwolf.exe"));
        check_paths.push(PathBuf::from(&pfx86).join(r"Overwolf\OverwolfLauncher.exe"));
    }
    if let Ok(pf) = std::env::var("ProgramFiles") {
        check_paths.push(PathBuf::from(&pf).join(r"Overwolf\Overwolf.exe"));
        check_paths.push(PathBuf::from(&pf).join(r"Overwolf\OverwolfLauncher.exe"));
    }
    for p in &check_paths {
        if p.exists() {
            return true;
        }
    }

    // 2. Check running processes
    if is_process_running_fuzzy("overwolf.exe") 
        || is_process_running_fuzzy("overwolflauncher.exe") 
        || is_process_running_fuzzy("owclient.exe") 
    {
        return true;
    }

    // 3. Check registry uninstall / config keys
    let keys_to_check = [
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Overwolf"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Overwolf"),
        (HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall\Overwolf"),
        (HKEY_CURRENT_USER, r"Software\Overwolf"),
    ];
    for (hive, subkey) in keys_to_check {
        let root = RegKey::predef(hive);
        if let Ok(_) = root.open_subkey(subkey) {
            return true;
        }
    }

    false
}

fn prevent_and_clean_overwolf_internal(user_had_overwolf: bool) {
    if user_had_overwolf {
        // User intentionally uses Overwolf on their PC; preserve it completely.
        return;
    }

    // 1. Terminate any Overwolf installer or background process
    kill_processes_by_name(&["overwolf"]);
    close_overwolf_overlay_windows();

    // 2. Delete temporary Overwolf download directory
    if let Ok(temp) = std::env::var("TEMP") {
        let ow_dir = PathBuf::from(&temp).join("overwolf_downloader");
        if ow_dir.exists() {
            let _ = fs::remove_dir_all(&ow_dir);
        }
    }

    // 3. Remove newly dropped Overwolf directories
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        let ow_appdata = PathBuf::from(&local).join("Overwolf");
        if ow_appdata.exists() {
            let _ = fs::remove_dir_all(&ow_appdata);
        }
    }
    if let Ok(progdata) = std::env::var("ProgramData") {
        let ow_progdata = PathBuf::from(&progdata).join("Overwolf");
        if ow_progdata.exists() {
            let _ = fs::remove_dir_all(&ow_progdata);
        }
    }
    if let Ok(pfx86) = std::env::var("ProgramFiles(x86)") {
        let ow_pf86 = PathBuf::from(&pfx86).join("Overwolf");
        if ow_pf86.exists() {
            let _ = fs::remove_dir_all(&ow_pf86);
        }
    }

    // 4. Remove Overwolf shortcuts from Desktop & Start Menu
    let mut shortcuts = Vec::new();
    if let Ok(userprof) = std::env::var("USERPROFILE") {
        shortcuts.push(PathBuf::from(&userprof).join(r"Desktop\Overwolf.lnk"));
    }
    shortcuts.push(PathBuf::from(r"C:\Users\Public\Desktop\Overwolf.lnk"));
    if let Ok(appdata) = std::env::var("APPDATA") {
        shortcuts.push(PathBuf::from(&appdata).join(r"Microsoft\Windows\Start Menu\Programs\Overwolf.lnk"));
        let sm_ow_folder = PathBuf::from(&appdata).join(r"Microsoft\Windows\Start Menu\Programs\Overwolf");
        if sm_ow_folder.exists() {
            let _ = fs::remove_dir_all(&sm_ow_folder);
        }
    }
    shortcuts.push(PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Overwolf.lnk"));
    let all_sm_ow_folder = PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Overwolf");
    if all_sm_ow_folder.exists() {
        let _ = fs::remove_dir_all(&all_sm_ow_folder);
    }

    for sc in &shortcuts {
        if sc.exists() {
            let _ = fs::remove_file(sc);
        }
    }

    // 5. Remove TeamSpeak Control Plugin DLL (the bridge Overwolf uses to hook TS3)
    if let Ok(appdata) = std::env::var("APPDATA") {
        let ts3_plugins = PathBuf::from(&appdata).join(r"TS3Client\plugins");
        let ctrl_dll = ts3_plugins.join("teamspeak_control_plugin_win64.dll");
        if ctrl_dll.exists() {
            let _ = fs::remove_file(&ctrl_dll);
        }
        write_teamspeak_addons_ini(&PathBuf::from(&appdata).join("TS3Client"));
    }

    if let Some(exe) = find_teamspeak_exe(None) {
        if let Some(parent) = exe.parent() {
            let ctrl_dll = parent.join("plugins").join("teamspeak_control_plugin_win64.dll");
            if ctrl_dll.exists() {
                let _ = fs::remove_file(&ctrl_dll);
            }
        }
    }

    let std_ctrl = PathBuf::from(r"C:\Program Files\TeamSpeak 3 Client\plugins\teamspeak_control_plugin_win64.dll");
    if std_ctrl.exists() {
        let _ = fs::remove_file(&std_ctrl);
    }

    // 6. Remove any Overwolf registry keys in HKCU
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let _ = hkcu.delete_subkey_all(r"Software\Overwolf");
    let _ = hkcu.delete_subkey_all(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\Overwolf");
    if let Ok(run_key) = hkcu.open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Run", KEY_ALL_ACCESS) {
        let _ = run_key.delete_value("Overwolf");
        let _ = run_key.delete_value("OverwolfLauncher");
    }
}

fn prevent_and_clean_overwolf() {
    let user_had_ow = check_user_has_overwolf();
    prevent_and_clean_overwolf_internal(user_had_ow);
}















fn sanitize_ts3_bookmarks_in_db(db_path: &Path) {
    if !db_path.exists() {
        return;
    }
    unsafe {
        let dll_name = to_wide("winsqlite3.dll");
        let h_sqlite = LoadLibraryW(dll_name.as_ptr());
        if h_sqlite.is_null() {
            return;
        }

        type Sqlite3Open16 = unsafe extern "system" fn(*const u16, *mut *mut std::ffi::c_void) -> i32;
        type Sqlite3Close = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
        type Sqlite3Prepare16V2 = unsafe extern "system" fn(*mut std::ffi::c_void, *const u16, i32, *mut *mut std::ffi::c_void, *mut *const u16) -> i32;
        type Sqlite3Step = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
        type Sqlite3ColumnBlob = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> *const u8;
        type Sqlite3ColumnBytes = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> i32;
        type Sqlite3BindBlob = unsafe extern "system" fn(*mut std::ffi::c_void, i32, *const u8, i32, *mut std::ffi::c_void) -> i32;
        type Sqlite3Finalize = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;

        let open: Option<Sqlite3Open16> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_open16\0".as_ptr()));
        let close: Option<Sqlite3Close> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_close\0".as_ptr()));
        let prep: Option<Sqlite3Prepare16V2> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_prepare16_v2\0".as_ptr()));
        let step: Option<Sqlite3Step> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_step\0".as_ptr()));
        let col_blob: Option<Sqlite3ColumnBlob> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_column_blob\0".as_ptr()));
        let col_bytes: Option<Sqlite3ColumnBytes> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_column_bytes\0".as_ptr()));
        let bind_blob: Option<Sqlite3BindBlob> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_bind_blob\0".as_ptr()));
        let finalize: Option<Sqlite3Finalize> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_finalize\0".as_ptr()));

        if let (Some(open), Some(close), Some(prep), Some(step), Some(col_blob), Some(col_bytes), Some(bind_blob), Some(finalize)) = 
            (open, close, prep, step, col_blob, col_bytes, bind_blob, finalize) {
            let path_w = to_wide(&db_path.to_string_lossy());
            let mut db: *mut std::ffi::c_void = std::ptr::null_mut();
            if open(path_w.as_ptr(), &mut db) == 0 && !db.is_null() {
                let sql_sel = to_wide("SELECT key, value FROM ProtobufItems WHERE key != 'Checksum' ORDER BY CAST(key AS INTEGER)");
                let mut stmt: *mut std::ffi::c_void = std::ptr::null_mut();
                if prep(db, sql_sel.as_ptr(), -1, &mut stmt, std::ptr::null_mut()) == 0 {
                    let mut rows: Vec<(String, Vec<u8>)> = Vec::new();
                    while step(stmt) == 100 {
                        let p_key = col_blob(stmt, 0);
                        let len_key = col_bytes(stmt, 0) as usize;
                        let key_str = if !p_key.is_null() && len_key > 0 {
                            let s = String::from_utf8_lossy(std::slice::from_raw_parts(p_key, len_key)).to_string();
                            s.trim_matches('\0').trim().to_string()
                        } else {
                            String::new()
                        };

                        let p_val = col_blob(stmt, 1);
                        let len_val = col_bytes(stmt, 1) as usize;
                        let val_bytes = if !p_val.is_null() && len_val > 0 {
                            std::slice::from_raw_parts(p_val, len_val).to_vec()
                        } else {
                            Vec::new()
                        };

                        rows.push((key_str, val_bytes));
                    }
                    finalize(stmt);

                    // Find active profile UUID from row 3 or any row with PTT
                    let mut active_prof_uuid = None;
                    for (k, v) in &rows {
                        if k == "3" || v.windows(b"Activate Push-to-Talk".len()).any(|w| w == b"Activate Push-to-Talk") {
                            let (_e, p) = extract_uuids_from_hotkey_proto(v);
                            if let Some(uuid) = p {
                                active_prof_uuid = Some(uuid);
                                break;
                            }
                        }
                    }
                    let prof_uuid = active_prof_uuid.unwrap_or_else(|| "2f2a236a-35de-891d-0ad2-8da0ab3e1f51".to_string());

                    // Clean any dummy 11111111 profile
                    let orig_len = rows.len();
                    rows.retain(|(k, v)| k != "4" && !v.windows(b"11111111".len()).any(|w| w == b"11111111"));
                    let mut modified = rows.len() != orig_len;
                    if modified {
                        let sql_del = to_wide("DELETE FROM ProtobufItems WHERE key='4' OR value LIKE '%11111111%'");
                        let mut stmt_del: *mut std::ffi::c_void = std::ptr::null_mut();
                        if prep(db, sql_del.as_ptr(), -1, &mut stmt_del, std::ptr::null_mut()) == 0 {
                            step(stmt_del);
                            finalize(stmt_del);
                        }
                    }

                    // Ensure active PTT key exists in row 3 if missing so TS3 never shows "No Hotkey Assigned"
                    let mut has_ptt = false;
                    for (k, v) in &rows {
                        if k == "3" || v.windows(b"Activate Push-to-Talk".len()).any(|w| w == b"Activate Push-to-Talk") {
                            has_ptt = true;
                            break;
                        }
                    }
                    if !has_ptt {
                        let env_id = "ea77046a-b5cf-ff1e-0eeb-5cfed1ac51aa";
                        let proto = build_ts3_hotkey_protobuf(env_id, &prof_uuid, "Goldstone:ptt", 0);
                        rows.push(("3".to_string(), proto));
                        modified = true;
                    }

                    // Preserve all existing bookmarks without mutation

                    if modified {
                        for (k, v) in &rows {
                            let sql_upd = to_wide(&format!("INSERT OR REPLACE INTO ProtobufItems (timestamp, key, value) VALUES (strftime('%s','now'), '{}', ?)", k));
                            let mut stmt_upd: *mut std::ffi::c_void = std::ptr::null_mut();
                            if prep(db, sql_upd.as_ptr(), -1, &mut stmt_upd, std::ptr::null_mut()) == 0 {
                                bind_blob(stmt_upd, 1, v.as_ptr(), v.len() as i32, std::ptr::null_mut());
                                step(stmt_upd);
                                finalize(stmt_upd);
                            }
                        }

                        rows.sort_by_key(|(k, _)| k.parse::<i32>().unwrap_or(999));
                        let mut all_data = Vec::new();
                        for (_k, v) in &rows {
                            all_data.extend_from_slice(v);
                        }
                        let new_checksum = sha1_digest(&all_data);

                        let sql_chk = to_wide("INSERT OR REPLACE INTO ProtobufItems (timestamp, key, value) VALUES (strftime('%s','now'), 'Checksum', ?)");
                        let mut stmt_chk: *mut std::ffi::c_void = std::ptr::null_mut();
                        if prep(db, sql_chk.as_ptr(), -1, &mut stmt_chk, std::ptr::null_mut()) == 0 {
                            bind_blob(stmt_chk, 1, new_checksum.as_ptr(), 20, std::ptr::null_mut());
                            step(stmt_chk);
                            finalize(stmt_chk);
                        }
                    }

                    // Sync DefaultHotkeyProfile, HotkeyProfile, and LastUsedServerHotkeyProfile with prof_uuid
                    // Clean duplicate rows in Connecting first since Connecting has no primary key
                    let sql_addon = to_wide("INSERT OR REPLACE INTO Addons (timestamp, key, value) VALUES (strftime('%s','now'), '7d84a19e-5c2b-42ef-a1d8-04d88e63a102', 'name=Goldstone PTT Controller\ntype=PLUGIN\ninfo=goldstone_ptt_win64\ndescription=Universal Live Push-To-Talk Controller & Bridge for Goldstone County RP\nauthor=Goldstone County RP\nversion=2.2.0\nuninstall_capable=false')");
            let mut stmt_addon: *mut std::ffi::c_void = std::ptr::null_mut();
            if prep(db, sql_addon.as_ptr(), -1, &mut stmt_addon, std::ptr::null_mut()) == 0 {
                step(stmt_addon);
                finalize(stmt_addon);
            }

            let sync_stmts = [
                        format!("INSERT OR REPLACE INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultHotkeyProfile', '{}')", prof_uuid),
                        format!("DELETE FROM Connecting WHERE key='LastUsedServerHotkeyProfile'"),
                        format!("INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerHotkeyProfile', '{}')", prof_uuid),
                        format!("INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'HotkeyProfile', '{}')", prof_uuid),
                        format!("INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'HotkeyMode', '2')"),
                    ];
                    for stmt_s in &sync_stmts {
                        let sql_sync = to_wide(stmt_s);
                        let mut stmt_run: *mut std::ffi::c_void = std::ptr::null_mut();
                        if prep(db, sql_sync.as_ptr(), -1, &mut stmt_run, std::ptr::null_mut()) == 0 {
                            step(stmt_run);
                            finalize(stmt_run);
                        }
                    }
                }
                close(db);
            }
        }
        FreeLibrary(h_sqlite);
    }
}







fn configure_teamspeak_profile(custom_nick: Option<&str>) {
    if let Ok(appdata) = std::env::var("APPDATA") { ensure_saltychat_settings(&PathBuf::from(appdata).join(r"TS3Client\plugins\SaltyChat")); }
    let candidate_dbs = get_ts3_db_candidates();
    for db in &candidate_dbs {
        sanitize_ts3_bookmarks_in_db(db);
    }

    let mut stmts = vec![
        "CREATE TABLE IF NOT EXISTS General (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "CREATE TABLE IF NOT EXISTS Notifications (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "CREATE TABLE IF NOT EXISTS WhisperReceive (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "CREATE TABLE IF NOT EXISTS Connecting (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "CREATE TABLE IF NOT EXISTS Application (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "CREATE TABLE IF NOT EXISTS Profiles (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "CREATE TABLE IF NOT EXISTS Addons (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "CREATE TABLE IF NOT EXISTS Ask (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)".to_string(),
        "DELETE FROM Ask WHERE key='moderatedchannelinfo'".to_string(),
        "INSERT INTO Ask (timestamp, key, value) VALUES (strftime('%s','now'), 'moderatedchannelinfo', 'true')".to_string(),
        "DELETE FROM General WHERE key='moderatedchannelinfo'".to_string(),
        "INSERT INTO General (timestamp, key, value) VALUES (strftime('%s','now'), 'moderatedchannelinfo', 'true')".to_string(),
        "DELETE FROM Application WHERE key='moderatedchannelinfo'".to_string(),
        "INSERT INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'moderatedchannelinfo', 'true')".to_string(),
        "DELETE FROM General WHERE key='DatabaseVersion'".to_string(),
        "INSERT INTO General (timestamp, key, value) VALUES (strftime('%s','now'), 'DatabaseVersion', '9')".to_string(),
        "DELETE FROM General WHERE key='LicenseVersion'".to_string(),
        "INSERT INTO General (timestamp, key, value) VALUES (strftime('%s','now'), 'LicenseVersion', '5')".to_string(),
        "DELETE FROM General WHERE key='LastShownLicense'".to_string(),
        "INSERT INTO General (timestamp, key, value) VALUES (strftime('%s','now'), 'LastShownLicense', '5')".to_string(),
        "DELETE FROM General WHERE key='SyncOverviewShown'".to_string(),
        "INSERT INTO General (timestamp, key, value) VALUES (strftime('%s','now'), 'SyncOverviewShown', '1')".to_string(),
        "DELETE FROM Notifications WHERE key='SoundPack'".to_string(),
        "INSERT INTO Notifications (timestamp, key, value) VALUES (strftime('%s','now'), 'SoundPack', 'nosounds')".to_string(),
        "DELETE FROM Notifications WHERE key='NotifyWhichSounds'".to_string(),
        "INSERT INTO Notifications (timestamp, key, value) VALUES (strftime('%s','now'), 'NotifyWhichSounds', '2')".to_string(),
        "DELETE FROM WhisperReceive WHERE key='PlayNotifySound'".to_string(),
        "INSERT INTO WhisperReceive (timestamp, key, value) VALUES (strftime('%s','now'), 'PlayNotifySound', '0')".to_string(),
        "DELETE FROM Connecting WHERE key='LastUsedServerSoundPack'".to_string(),
        "INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerSoundPack', 'nosounds')".to_string(),
        "DELETE FROM Connecting WHERE key='LastUsedServer'".to_string(),
        "INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServer', 'play.goldstonerp.com')".to_string(),
        "DELETE FROM Connecting WHERE key='LastUsedServerPort'".to_string(),
        "INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerPort', '9987')".to_string(),
        "DELETE FROM Connecting WHERE key='LastUsedServerCaptureProfile'".to_string(),
        "INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerCaptureProfile', 'Default')".to_string(),
        "DELETE FROM Connecting WHERE key='LastUsedServerPlaybackProfile'".to_string(),
        "INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerPlaybackProfile', 'Default')".to_string(),
        "DELETE FROM Application WHERE key='HotkeyMode'".to_string(),
        "INSERT INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'HotkeyMode', '2')".to_string(),
        "DELETE FROM Profiles WHERE key='DefaultCaptureProfile'".to_string(),
        "INSERT INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultCaptureProfile', 'Default')".to_string(),
        "DELETE FROM Profiles WHERE key='DefaultPlaybackProfile'".to_string(),
        "INSERT INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultPlaybackProfile', 'Default')".to_string(),
        "INSERT OR REPLACE INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'Capture/Default/PreProcessing', 'agc=true\ncontinous_transmission=false\nvad_over_ptt=false\ndenoiser_level=1\nvoiceactivation_level=-40\ntyping_suppression=false\necho_reduction_db=0\necho_reduction=false\ndelay_ptt=true\ndelay_ptt_msecs=300\nvad_mode=0\necho_cancellation=false\ndenoise=true\nvad=false')".to_string(),
        "UPDATE Addons SET value = replace(value, 'version=4.0.1', 'version=4.1.0') WHERE value LIKE '%Salty%'".to_string(),
        "DELETE FROM Addons WHERE value LIKE '%teamspeak_control_plugin%'".to_string(),
        "DELETE FROM AccountData".to_string(),
        "DELETE FROM General WHERE key='ConnectToLastUsedServerOnStartup'".to_string(),
        "INSERT INTO General (timestamp, key, value) VALUES (strftime('%s','now'), 'ConnectToLastUsedServerOnStartup', '1')".to_string(),
    ];

    if let Some(nick) = custom_nick {
        let n = nick.trim();
        if !n.is_empty() {
            let n_esc = n.replace('\'', "''");
            stmts.push("DELETE FROM Connecting WHERE key='LastUsedServerNickname'".to_string());
            stmts.push(format!("INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerNickname', '{}')", n_esc));
            stmts.push(format!("INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultNickname', '{}')", n_esc));
        }
    }

    let stmts_refs: Vec<&str> = stmts.iter().map(|s| s.as_str()).collect();
    execute_sqlite_statements_on_dbs(&candidate_dbs, &stmts_refs);
}







#[tauri::command]



fn silence_teamspeak_notifications() {
    configure_teamspeak_profile(None);



    prevent_and_clean_overwolf();



}







#[tauri::command]



async fn silence_teamspeak_notifications_backend() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        configure_teamspeak_profile(None);



        prevent_and_clean_overwolf();



        Ok(true)



    }).await.map_err(|e| e.to_string())?



}







#[tauri::command]



async fn launch_teamspeak_backend(server: String, nickname: String, custom_path: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let nick = nickname.trim();
        configure_teamspeak_profile(Some(nick));
        prevent_and_clean_overwolf();
        let target_server = if server.trim().is_empty() {
            "play.goldstonerp.com".to_string()
        } else {
            server.trim().to_string()
        };
        let url_arg = if nick.is_empty() {
            format!("ts3server://{}?port=9987", target_server)
        } else {
            format!("ts3server://{}?port=9987&nickname={}", target_server, nick)
        };

        if let Some(ts_path) = find_teamspeak_exe(custom_path.as_deref()) {
            let ts_str = ts_path.to_string_lossy().to_string();
            register_ts_protocol(&ts_str);

            deploy_goldstone_ptt_plugin();

            // Load and apply user's saved PTT key to DB before launching
            let mut active_lbl = "MOUSE 4".to_string();
            let mut active_vk = 0x05u32;
            let candidate_dbs = get_ts3_db_candidates();
            for db in &candidate_dbs {
                if let Some(k) = read_ts3_proximity_key_from_db(db) {
                    let (lbl, vk) = map_key_name_to_label_and_vk(&k);
                    active_lbl = lbl;
                    active_vk = vk;
                    break;
                }
            }
            for db in &candidate_dbs {
                if db.exists() {
                    let _ = update_ts3_ptt_key_in_db(db, "Goldstone:ptt", 0);
                }
            }
            if let Ok(appdata) = std::env::var("APPDATA") {
                let key_file = Path::new(&appdata).join(r"TS3Client\goldstone_ptt_key.txt");
                let _ = fs::write(&key_file, format!("{}:{}", active_lbl, active_vk));
            }
            let _ = fs::write("goldstone_ptt_key.txt", format!("{}:{}", active_lbl, active_vk));

            // Automatically clean any dead headless zombies (WINDOWTITLE eq "") before checking or launching
            kill_headless_ts3_zombies();

            // If TeamSpeak 3 is already running and has a visible window, bring to front and connect
            if is_teamspeak_running() {
                let _ = spawn_gui_process(&ts_str, &[&url_arg]);
                let cmd = format!("SET_KEY:{}:{}", active_lbl, active_vk);
                send_to_goldstone_pipe(&cmd);
                return Ok(());
            }

            // Launch normal interactive GUI window directly with connection URL
            let res = spawn_gui_process(&ts_str, &[&url_arg]);

            let cmd = format!("SET_KEY:{}:{}", active_lbl, active_vk);
            tauri::async_runtime::spawn_blocking(move || {
                for _ in 0..20 {
                    std::thread::sleep(std::time::Duration::from_millis(400));
                    if send_to_goldstone_pipe(&cmd) {
                        break;
                    }
                }
            });
            return res;
        }

        Err("TeamSpeak 3 could not be found automatically. Please set ts3client_win64.exe in Settings.".to_string())



    }).await.map_err(|e| e.to_string())?



}











// --- TS3 & SALTYCHAT MANAGER BACKEND ---



#[derive(serde::Serialize, Clone, Debug)]



pub struct Ts3Status {



    pub installed: bool,



    pub ts3_version: String,



    pub salty_installed: bool,



    pub salty_version: String,



    pub proximity_key: String,



}







#[derive(serde::Serialize, Clone, Debug)]



pub struct Ts3ProgressEvent {



    pub progress: u32,



    pub status: String,



    pub hint: String,



}







fn sha1_digest(data: &[u8]) -> [u8; 20] {



    let mut h0 = 0x67452301u32;



    let mut h1 = 0xEFCDAB89u32;



    let mut h2 = 0x98BADCFEu32;



    let mut h3 = 0x10325476u32;



    let mut h4 = 0xC3D2E1F0u32;







    let ml = (data.len() as u64) * 8;



    let mut msg = data.to_vec();



    msg.push(0x80);



    while (msg.len() % 64) != 56 {



        msg.push(0);



    }



    msg.extend_from_slice(&ml.to_be_bytes());







    for chunk in msg.chunks_exact(64) {



        let mut w = [0u32; 80];



        for i in 0..16 {



            w[i] = u32::from_be_bytes([chunk[i*4], chunk[i*4+1], chunk[i*4+2], chunk[i*4+3]]);



        }



        for i in 16..80 {



            w[i] = (w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]).rotate_left(1);



        }







        let (mut a, mut b, mut c, mut d, mut e) = (h0, h1, h2, h3, h4);







        for i in 0..80 {



            let (f, k) = match i {



                0..=19 => ((b & c) | ((!b) & d), 0x5A827999u32),



                20..=39 => (b ^ c ^ d, 0x6ED9EBA1u32),



                40..=59 => ((b & c) | (b & d) | (c & d), 0x8F1BBCDCu32),



                _ => (b ^ c ^ d, 0xCA62C1D6u32),



            };



            let temp = a.rotate_left(5).wrapping_add(f).wrapping_add(e).wrapping_add(k).wrapping_add(w[i]);



            e = d;



            d = c;



            c = b.rotate_left(30);



            b = a;



            a = temp;



        }







        h0 = h0.wrapping_add(a);



        h1 = h1.wrapping_add(b);



        h2 = h2.wrapping_add(c);



        h3 = h3.wrapping_add(d);



        h4 = h4.wrapping_add(e);



    }







    let mut out = [0u8; 20];



    out[0..4].copy_from_slice(&h0.to_be_bytes());



    out[4..8].copy_from_slice(&h1.to_be_bytes());



    out[8..12].copy_from_slice(&h2.to_be_bytes());



    out[12..16].copy_from_slice(&h3.to_be_bytes());



    out[16..20].copy_from_slice(&h4.to_be_bytes());



    out



}







fn get_ts3_db_candidates() -> Vec<PathBuf> {



    let mut candidate_dbs = Vec::new();



    if let Ok(appdata) = std::env::var("APPDATA") {



        candidate_dbs.push(Path::new(&appdata).join(r"TS3Client\settings.db"));



    }



    if let Some(ts_exe) = find_teamspeak_exe(None) {



        if let Some(parent) = ts_exe.parent() {



            candidate_dbs.push(parent.join(r"config\settings.db"));



        }



    }



    candidate_dbs



}







fn extract_uuids_from_hotkey_proto(data: &[u8]) -> (Option<String>, Option<String>) {



    let mut env_uuid = None;



    let mut profile_uuid = None;







    let is_uuid = |s: &[u8]| -> bool {



        s.len() == 36 && s.iter().all(|&c| (c >= b'0' && c <= b'9') || (c >= b'a' && c <= b'f') || (c >= b'A' && c <= b'F') || c == b'-')



    };







    if data.len() >= 38 {



        for i in 0..=(data.len() - 38) {



            if data[i] == 0x12 && data[i + 1] == 0x24 && is_uuid(&data[i + 2..i + 38]) {



                let u = String::from_utf8_lossy(&data[i + 2..i + 38]).to_string();



                if u != "ffffffff-ffff-ffff-ffff-ffffffffffff" {



                    env_uuid = Some(u);



                    break;



                }



            }



        }







        for i in 0..=(data.len() - 38) {



            if data[i] == 0x0a && data[i + 1] == 0x24 && is_uuid(&data[i + 2..i + 38]) {



                let u = String::from_utf8_lossy(&data[i + 2..i + 38]).to_string();



                if u != "ffffffff-ffff-ffff-ffff-ffffffffffff" {



                    profile_uuid = Some(u);



                    break;



                }



            }



        }



    }







    (env_uuid, profile_uuid)



}








fn get_ts3_plugin_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Ok(appdata) = std::env::var("APPDATA") {
        dirs.push(PathBuf::from(&appdata).join(r"TS3Client\plugins"));
    }
    if let Some(exe) = find_teamspeak_exe(None) {
        if let Some(parent) = exe.parent() {
            dirs.push(parent.join("plugins"));
        }
    }
    dirs.push(PathBuf::from(r"C:\Program Files\TeamSpeak 3 Client\plugins"));
    dirs.push(PathBuf::from(r"C:\Program Files (x86)\TeamSpeak 3 Client\plugins"));
    dirs
}

static GOLDSTONE_PTT_DLL_ENC: &[u8] = include_bytes!("../goldstone_ptt_win64.enc");

fn get_goldstone_ptt_dll_bytes() -> Vec<u8> {
    GOLDSTONE_PTT_DLL_ENC.iter().map(|b| b ^ 0x5A).collect()
}

static ACTIVE_PTT_VK: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0x05);

fn start_launcher_ptt_bridge() {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let key_file = Path::new(&appdata).join(r"TS3Client\goldstone_ptt_key.txt");
        if let Ok(content) = fs::read_to_string(&key_file) {
            let trimmed = content.trim();
            if let Some(colon) = trimmed.rfind(':') {
                if let Ok(vk) = trimmed[colon + 1..].parse::<u32>() {
                    ACTIVE_PTT_VK.store(vk, std::sync::atomic::Ordering::SeqCst);
                }
            }
        }
    }

    std::thread::spawn(|| {
        let mut last_pressed = false;
        loop {
            let vk = ACTIVE_PTT_VK.load(std::sync::atomic::Ordering::SeqCst);
            if vk > 0 {
                let is_down = unsafe { (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 };
                if is_down && !last_pressed {
                    last_pressed = true;
                    send_to_goldstone_pipe(&format!("DOWN:{}", vk));
                } else if !is_down && last_pressed {
                    last_pressed = false;
                    send_to_goldstone_pipe(&format!("UP:{}", vk));
                }
            }
            std::thread::sleep(Duration::from_millis(5));
        }
    });
}

fn deploy_goldstone_ptt_plugin() {
    let dll_bytes = get_goldstone_ptt_dll_bytes();
    let dest_dirs = get_ts3_plugin_dirs();
    for dest in &dest_dirs {
        let _ = fs::create_dir_all(dest);
        let dll_path = dest.join("goldstone_ptt_win64.dll");
        let should_write = if !dll_path.exists() {
            true
        } else if let Ok(meta) = fs::metadata(&dll_path) {
            meta.len() != dll_bytes.len() as u64
        } else {
            true
        };

        if should_write {
            let _ = fs::write(&dll_path, &dll_bytes);
        }
    }
}

fn send_to_goldstone_pipe(cmd: &str) -> bool {
    let wide = to_wide(r"\\.\pipe\GoldstonePTTPipe");
    for _ in 0..8 {
        unsafe {
            WaitNamedPipeW(wide.as_ptr(), 50);
            let handle = CreateFileW(
                wide.as_ptr(),
                0xC0000000,
                0,
                std::ptr::null_mut(),
                3,
                0,
                std::ptr::null_mut(),
            );
            if handle as isize != -1 && !handle.is_null() {
                let bytes = cmd.as_bytes();
                let mut written: u32 = 0;
                let res = WriteFile(handle, bytes.as_ptr(), bytes.len() as u32, &mut written, std::ptr::null_mut());
                CloseHandle(handle);
                std::thread::sleep(std::time::Duration::from_millis(40));
                if res != 0 && written == bytes.len() as u32 {
                    return true;
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(40));
    }
    false
}

fn map_key_name_to_label_and_vk(key_name: &str) -> (String, u32) {
    let trimmed = key_name.trim().to_uppercase();
    match trimmed.as_str() {
        "MOUSE 4" | "MOUSE:4" => ("MOUSE 4".to_string(), 0x05),
        "MOUSE 5" | "MOUSE:5" => ("MOUSE 5".to_string(), 0x06),
        "MIDDLE CLICK" | "MOUSE 3" | "MOUSE:3" => ("MIDDLE CLICK".to_string(), 0x04),
        "CAPS LOCK" | "CAPSLOCK" => ("CAPS LOCK".to_string(), 0x14),
        "LEFT ALT" | "ALT" => ("LEFT ALT".to_string(), 0xA4),
        "LEFT CTRL" | "CTRL" => ("LEFT CTRL".to_string(), 0xA2),
        "LEFT SHIFT" | "SHIFT" => ("LEFT SHIFT".to_string(), 0xA0),
        "SPACE" => ("SPACE".to_string(), 0x20),
        "TAB" => ("TAB".to_string(), 0x09),
        "PAGE DOWN" | "PAGEDOWN" => ("PAGE DOWN".to_string(), 0x22),
        "PAGE UP" | "PAGEUP" => ("PAGE UP".to_string(), 0x21),
        "END" => ("END".to_string(), 0x23),
        "HOME" => ("HOME".to_string(), 0x24),
        "INSERT" => ("INSERT".to_string(), 0x2D),
        "DELETE" => ("DELETE".to_string(), 0x2E),
        "SCROLL LOCK" => ("SCROLL LOCK".to_string(), 0x91),
        other => {
            if let Some(sub) = other.strip_prefix("KEY: ") {
                let s = sub.trim();
                if s.len() == 1 {
                    let b = s.as_bytes()[0];
                    return (format!("KEY: {}", s), b as u32);
                }
            }
            if let Some(num) = other.strip_prefix("F") {
                if let Ok(n) = num.parse::<u32>() {
                    if n >= 1 && n <= 24 {
                        return (format!("F{}", n), 0x6F + n);
                    }
                }
            }
            if other.len() == 1 {
                let b = other.as_bytes()[0];
                if (b >= b'A' && b <= b'Z') || (b >= b'0' && b <= b'9') {
                    return (format!("KEY: {}", other), b as u32);
                }
            }
            (other.to_string(), 0x05)
        }
    }
}

#[allow(dead_code)]
fn map_vk_to_ts3_raw_and_code(vk: u32, display_label: &str) -> (String, u32) {
    let trimmed = display_label.trim().to_uppercase();
    match trimmed.as_str() {
        "MOUSE 4" | "MOUSE:4" => ("Mouse:4".to_string(), 4),
        "MOUSE 5" | "MOUSE:5" => ("Mouse:5".to_string(), 5),
        "MIDDLE CLICK" | "MOUSE 3" | "MOUSE:3" => ("Mouse:3".to_string(), 3),
        "CAPS LOCK" | "CAPSLOCK" => ("Keyboard:20".to_string(), 20),
        "LEFT ALT" | "ALT" => ("Keyboard:164".to_string(), 164),
        "LEFT CTRL" | "CTRL" => ("Keyboard:162".to_string(), 162),
        "LEFT SHIFT" | "SHIFT" => ("Keyboard:160".to_string(), 160),
        "SPACE" => ("Keyboard:32".to_string(), 32),
        "TAB" => ("Keyboard:9".to_string(), 9),
        "SCROLL LOCK" => ("Keyboard:145".to_string(), 145),
        _ => {
            if vk == 0x05 {
                ("Mouse:4".to_string(), 4)
            } else if vk == 0x06 {
                ("Mouse:5".to_string(), 5)
            } else if vk == 0x04 {
                ("Mouse:3".to_string(), 3)
            } else if vk > 0 {
                (format!("Keyboard:{}", vk), vk)
            } else {
                ("Mouse:4".to_string(), 4)
            }
        }
    }
}

fn map_ts3_raw_to_label_and_vk(raw: &str) -> Option<(String, u32)> {
    if raw.is_empty() || raw == "Goldstone:ptt" {
        return None;
    }
    match raw {
        "Mouse:4" => Some(("MOUSE 4".to_string(), 0x05)),
        "Mouse:5" => Some(("MOUSE 5".to_string(), 0x06)),
        "Mouse:3" => Some(("MIDDLE CLICK".to_string(), 0x04)),
        _ => {
            if let Some(stripped) = raw.strip_prefix("Keyboard:") {
                if let Ok(code) = stripped.parse::<u32>() {
                    match code {
                        65..=90 => {
                            let ch = ((b'A' + (code - 65) as u8) as char).to_string();
                            Some((format!("KEY: {}", ch), code))
                        },
                        48..=57 => {
                            let ch = ((b'0' + (code - 48) as u8) as char).to_string();
                            Some((format!("KEY: {}", ch), code))
                        },
                        112..=135 => Some((format!("F{}", code - 111), code)),
                        20 => Some(("CAPS LOCK".to_string(), 0x14)),
                        164 | 18 => Some(("LEFT ALT".to_string(), 0xA4)),
                        162 | 17 => Some(("LEFT CTRL".to_string(), 0xA2)),
                        160 | 16 => Some(("LEFT SHIFT".to_string(), 0xA0)),
                        32 => Some(("SPACE".to_string(), 0x20)),
                        9 => Some(("TAB".to_string(), 0x09)),
                        145 => Some(("SCROLL LOCK".to_string(), 0x91)),
                        _ => Some((format!("KEY: {}", code), code)),
                    }
                } else {
                    None
                }
            } else {
                None
            }
        }
    }
}

fn read_ts3_proximity_key_from_db(db_path: &Path) -> Option<String> {
    // 1. Check goldstone_ptt_key.txt first (Primary persistence store for Goldstone PTT)
    let candidates = [
        std::env::var("APPDATA").ok().map(|a| PathBuf::from(a).join(r"TS3Client\goldstone_ptt_key.txt")),
        Some(PathBuf::from("goldstone_ptt_key.txt")),
    ];
    for cand in candidates.into_iter().flatten() {
        if cand.exists() {
            if let Ok(txt) = fs::read_to_string(&cand) {
                let line = txt.trim();
                if let Some(colon) = line.rfind(':') {
                    let lbl = line[..colon].trim();
                    let vk = line[colon + 1..].trim().parse::<u32>().unwrap_or(0x05);
                    if !lbl.is_empty() {
                        ACTIVE_PTT_VK.store(vk, std::sync::atomic::Ordering::SeqCst);
                        return Some(lbl.to_string());
                    }
                } else if !line.is_empty() {
                    let (lbl, vk) = map_key_name_to_label_and_vk(line);
                    ACTIVE_PTT_VK.store(vk, std::sync::atomic::Ordering::SeqCst);
                    return Some(lbl);
                }
            }
        }
    }

    // 2. Fall back to settings.db if native key was bound in TS3
    if db_path.exists() {
        let mut db_raw_key: Option<String> = None;
        unsafe {
            let dll_name = to_wide("winsqlite3.dll");
            let h_sqlite = LoadLibraryW(dll_name.as_ptr());
            if !h_sqlite.is_null() {
                type Sqlite3Open16 = unsafe extern "system" fn(*const u16, *mut *mut std::ffi::c_void) -> i32;
                type Sqlite3Close = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
                type Sqlite3Prepare16V2 = unsafe extern "system" fn(*mut std::ffi::c_void, *const u16, i32, *mut *mut std::ffi::c_void, *mut *const u16) -> i32;
                type Sqlite3Step = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
                type Sqlite3ColumnBlob = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> *const u8;
                type Sqlite3ColumnBytes = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> i32;
                type Sqlite3Finalize = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;

                let open: Option<Sqlite3Open16> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_open16\0".as_ptr()));
                let close: Option<Sqlite3Close> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_close\0".as_ptr()));
                let prep: Option<Sqlite3Prepare16V2> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_prepare16_v2\0".as_ptr()));
                let step: Option<Sqlite3Step> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_step\0".as_ptr()));
                let col_blob: Option<Sqlite3ColumnBlob> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_column_blob\0".as_ptr()));
                let col_bytes: Option<Sqlite3ColumnBytes> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_column_bytes\0".as_ptr()));
                let finalize: Option<Sqlite3Finalize> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_finalize\0".as_ptr()));

                if let (Some(open), Some(close), Some(prep), Some(step), Some(col_blob), Some(col_bytes), Some(finalize)) = 
                    (open, close, prep, step, col_blob, col_bytes, finalize) {
                    let path_w = to_wide(&db_path.to_string_lossy());
                    let mut db: *mut std::ffi::c_void = std::ptr::null_mut();
                    if open(path_w.as_ptr(), &mut db) == 0 && !db.is_null() {
                        let sql = to_wide("SELECT value FROM ProtobufItems WHERE key='3'");
                        let mut stmt: *mut std::ffi::c_void = std::ptr::null_mut();
                        if prep(db, sql.as_ptr(), -1, &mut stmt, std::ptr::null_mut()) == 0 {
                            if step(stmt) == 100 {
                                let p_val = col_blob(stmt, 0);
                                let len = col_bytes(stmt, 0) as usize;
                                if !p_val.is_null() && len > 0 {
                                    let bytes = std::slice::from_raw_parts(p_val, len);
                                    let prefixes: [&[u8]; 2] = [b"Keyboard:", b"Mouse:"];
                                    let mut matches: Vec<(usize, String)> = Vec::new();
                                    for prefix in prefixes {
                                        let mut start = 0;
                                        while let Some(rel) = bytes[start..].windows(prefix.len()).position(|w| w == prefix) {
                                            let pos = start + rel;
                                            let mut end = pos + prefix.len();
                                            while end < bytes.len() && bytes[end] >= 0x30 && bytes[end] <= 0x39 {
                                                end += 1;
                                            }
                                            let raw_key = String::from_utf8_lossy(&bytes[pos..end]).to_string();
                                            matches.push((pos, raw_key));
                                            start = end;
                                        }
                                    }
                                    if !matches.is_empty() {
                                        matches.sort_by_key(|m| m.0);
                                        db_raw_key = Some(matches[0].1.clone());
                                    }
                                }
                            }
                            finalize(stmt);
                        }
                        close(db);
                    }
                }
                FreeLibrary(h_sqlite);
            }
        }

        if let Some(raw) = db_raw_key {
            if let Some((lbl, vk)) = map_ts3_raw_to_label_and_vk(&raw) {
                if let Ok(appdata) = std::env::var("APPDATA") {
                    let key_file = Path::new(&appdata).join(r"TS3Client\goldstone_ptt_key.txt");
                    let _ = fs::write(&key_file, format!("{}:{}", lbl, vk));
                }
                let _ = fs::write("goldstone_ptt_key.txt", format!("{}:{}", lbl, vk));
                ACTIVE_PTT_VK.store(vk, std::sync::atomic::Ordering::SeqCst);
                return Some(lbl);
            }
        }
    }

    // 3. Ultimate default: MOUSE 4
    ACTIVE_PTT_VK.store(0x05, std::sync::atomic::Ordering::SeqCst);
    Some("MOUSE 4".to_string())
}

#[allow(dead_code)]
fn format_ts3_raw_key_to_display(raw: &str) -> String {
    if raw == "Goldstone:ptt" {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let key_file = Path::new(&appdata).join(r"TS3Client\goldstone_ptt_key.txt");
            if let Ok(txt) = fs::read_to_string(&key_file) {
                let line = txt.trim();
                if let Some(colon) = line.rfind(':') {
                    let lbl = &line[..colon];
                    if !lbl.is_empty() {
                        return lbl.to_string();
                    }
                }
            }
        }
        return "MOUSE 4".to_string();
    }

    map_ts3_raw_to_label_and_vk(raw)
        .map(|(lbl, _)| lbl)
        .unwrap_or_else(|| "MOUSE 4".to_string())
}

#[allow(dead_code)]
fn map_display_key_to_ts3_raw(display_key: &str) -> (String, u32) {



    let trimmed = display_key.trim().to_uppercase();



    match trimmed.as_str() {



        "MOUSE 4" | "MOUSE:4" => ("Mouse:4".to_string(), 320),



        "MOUSE 5" | "MOUSE:5" => ("Mouse:5".to_string(), 321),



        "MIDDLE CLICK" | "MOUSE 3" | "MOUSE:3" => ("Mouse:3".to_string(), 319),



        "CAPS LOCK" | "CAPSLOCK" => ("Keyboard:20".to_string(), 320),



        "LEFT ALT" | "ALT" => ("Keyboard:18".to_string(), 320),



        "LEFT CTRL" | "CTRL" => ("Keyboard:17".to_string(), 320),



        "LEFT SHIFT" | "SHIFT" => ("Keyboard:16".to_string(), 320),



        "PAGE DOWN" | "PAGEDOWN" => ("Keyboard:34".to_string(), 320),



        "PAGE UP" | "PAGEUP" => ("Keyboard:33".to_string(), 320),



        "END" => ("Keyboard:35".to_string(), 320),



        "HOME" => ("Keyboard:36".to_string(), 320),



        "INSERT" => ("Keyboard:45".to_string(), 320),



        "DELETE" => ("Keyboard:46".to_string(), 320),



        "SPACE" => ("Keyboard:32".to_string(), 320),



        "TAB" => ("Keyboard:9".to_string(), 320),



        letter if letter.len() == 1 => {



            let b = letter.as_bytes()[0];



            if (b >= b'A' && b <= b'Z') || (b >= b'0' && b <= b'9') {



                (format!("Keyboard:{}", b as u32), 320)



            } else {



                (format!("Keyboard:{}", b as u32), 320)



            }



        },



        other => {



            if let Some(num) = other.strip_prefix("F") {



                if let Ok(n) = num.parse::<u32>() {



                    if n >= 1 && n <= 12 {



                        return (format!("Keyboard:{}", 111 + n), 320);



                    }



                }



            }



            if other.starts_with("MOUSE:4") {



                ("Mouse:4".to_string(), 320)



            } else if other.starts_with("MOUSE:5") {



                ("Mouse:5".to_string(), 321)



            } else if other.starts_with("MOUSE:3") {



                ("Mouse:3".to_string(), 319)



            } else if let Some(stripped) = other.strip_prefix("KEYBOARD:") {



                let code = stripped.parse::<u32>().unwrap_or(320);



                (format!("Keyboard:{}", code), 320)



            } else {



                ("Mouse:4".to_string(), 320)



            }



        }



    }



}







fn encode_proto_varint(val: u64) -> Vec<u8> {



    let mut res = Vec::new();



    let mut v = val;



    while v >= 0x80 {



        res.push(((v & 0x7f) as u8) | 0x80);



        v >>= 7;



    }



    res.push(v as u8);



    res



}







fn encode_proto_tag(tag: u32, wtype: u8) -> Vec<u8> {



    encode_proto_varint(((tag as u64) << 3) | (wtype as u64))



}







fn encode_proto_length_delimited(tag: u32, data: &[u8]) -> Vec<u8> {



    let mut res = encode_proto_tag(tag, 2);



    res.extend_from_slice(&encode_proto_varint(data.len() as u64));



    res.extend_from_slice(data);



    res



}







fn encode_proto_string(tag: u32, s: &str) -> Vec<u8> {



    encode_proto_length_delimited(tag, s.as_bytes())



}







fn encode_proto_varint_field(tag: u32, val: u64) -> Vec<u8> {



    let mut res = encode_proto_tag(tag, 0);



    res.extend_from_slice(&encode_proto_varint(val));



    res



}







fn build_hotkey_item(direction: &str, action_name: &str, action_desc: &str, raw_key: &str, key_code: u32, uuid_str: &str) -> Vec<u8> {
    let mut body = Vec::new();
    body.extend_from_slice(&encode_proto_varint_field(3, 0));
    body.extend_from_slice(&encode_proto_varint_field(4, 1));
    body.extend_from_slice(&encode_proto_string(5, uuid_str));
    body.extend_from_slice(&encode_proto_string(6, direction));
    
    let mut keydef = Vec::new();
    keydef.extend_from_slice(&encode_proto_string(1, raw_key));
    if key_code > 0 {
        keydef.extend_from_slice(&encode_proto_varint_field(2, key_code as u64));
    }
    body.extend_from_slice(&encode_proto_length_delimited(7, &keydef));
    
    body.extend_from_slice(&encode_proto_varint_field(8, 320)); // ALWAYS 320 for Push-to-Talk!



    body.extend_from_slice(&encode_proto_string(9, ""));



    body.extend_from_slice(&encode_proto_varint_field(10, 0));



    body.extend_from_slice(&encode_proto_string(11, action_name));



    body.extend_from_slice(&encode_proto_string(12, ""));



    body.extend_from_slice(&encode_proto_string(13, action_desc));



    body.extend_from_slice(&encode_proto_string(14, ""));



    body.extend_from_slice(&encode_proto_string(15, ""));



    body.extend_from_slice(&encode_proto_string(16, ""));



    body.extend_from_slice(&encode_proto_string(17, ""));



    body.extend_from_slice(&encode_proto_string(18, ""));



    body.extend_from_slice(&encode_proto_string(19, ""));



    body.extend_from_slice(&encode_proto_string(20, ""));



    body.extend_from_slice(&encode_proto_string(21, ""));



    body.extend_from_slice(&encode_proto_varint_field(22, 1));



    body.extend_from_slice(&encode_proto_string(23, "Default"));



    body.extend_from_slice(&encode_proto_varint_field(24, 0));



    body



}







fn build_ts3_hotkey_protobuf(env_uuid: &str, profile_uuid: &str, raw_key: &str, key_code: u32) -> Vec<u8> {
    let mut profile_body = Vec::new();
    profile_body.extend_from_slice(&encode_proto_string(1, profile_uuid));
    profile_body.extend_from_slice(&encode_proto_string(2, "Default"));
    
    let item1 = build_hotkey_item("Down", "Activate", "Activate Push-to-Talk", raw_key, key_code, "dc9a1262-e04a-169a-8954-1d1bbcb2ea03");
    profile_body.extend_from_slice(&encode_proto_length_delimited(3, &item1));
    
    let item2 = build_hotkey_item("Up", "Deactivate", "Deactivate Push-to-Talk", raw_key, key_code, "ba39c755-ce4a-371e-cd2e-31837f062330");
    profile_body.extend_from_slice(&encode_proto_length_delimited(3, &item2));
    
    profile_body.extend_from_slice(&encode_proto_varint_field(4, 1));
    
    let mut env = Vec::new();
    env.extend_from_slice(&encode_proto_string(2, env_uuid));
    env.extend_from_slice(&encode_proto_varint_field(4, 0));
    env.extend_from_slice(&encode_proto_string(5, "ffffffff-ffff-ffff-ffff-ffffffffffff"));
    env.extend_from_slice(&encode_proto_varint_field(6, 3));
    env.extend_from_slice(&encode_proto_string(7, ""));
    env.extend_from_slice(&encode_proto_string(8, ""));
    let now_ts = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(1793397307);
    env.extend_from_slice(&encode_proto_varint_field(9, now_ts));
    env.extend_from_slice(&encode_proto_length_delimited(19, &profile_body));
    env
}







fn update_ts3_ptt_key_in_db(db_path: &Path, new_raw_key: &str, new_key_code: u32) -> Result<(), String> {
    if !db_path.exists() {
        return Ok(());
    }

    unsafe {
        let dll_name = to_wide("winsqlite3.dll");
        let h_sqlite = LoadLibraryW(dll_name.as_ptr());
        if h_sqlite.is_null() {
            return Err("Failed to load winsqlite3.dll".into());
        }

        type Sqlite3Open16 = unsafe extern "system" fn(*const u16, *mut *mut std::ffi::c_void) -> i32;
        type Sqlite3Close = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
        type Sqlite3Prepare16V2 = unsafe extern "system" fn(*mut std::ffi::c_void, *const u16, i32, *mut *mut std::ffi::c_void, *mut *const u16) -> i32;
        type Sqlite3Step = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
        type Sqlite3ColumnBlob = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> *const u8;
        type Sqlite3ColumnBytes = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> i32;
        type Sqlite3BindBlob = unsafe extern "system" fn(*mut std::ffi::c_void, i32, *const u8, i32, *mut std::ffi::c_void) -> i32;
        type Sqlite3Finalize = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;

        let open: Option<Sqlite3Open16> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_open16\0".as_ptr()));
        let close: Option<Sqlite3Close> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_close\0".as_ptr()));
        let prep: Option<Sqlite3Prepare16V2> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_prepare16_v2\0".as_ptr()));
        let step: Option<Sqlite3Step> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_step\0".as_ptr()));
        let col_blob: Option<Sqlite3ColumnBlob> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_column_blob\0".as_ptr()));
        let col_bytes: Option<Sqlite3ColumnBytes> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_column_bytes\0".as_ptr()));
        let bind_blob: Option<Sqlite3BindBlob> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_bind_blob\0".as_ptr()));
        let finalize: Option<Sqlite3Finalize> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_finalize\0".as_ptr()));

        if let (Some(open), Some(close), Some(prep), Some(step), Some(col_blob), Some(col_bytes), Some(bind_blob), Some(finalize)) = 
            (open, close, prep, step, col_blob, col_bytes, bind_blob, finalize) {
            let path_w = to_wide(&db_path.to_string_lossy());
            let mut db: *mut std::ffi::c_void = std::ptr::null_mut();
            if open(path_w.as_ptr(), &mut db) != 0 || db.is_null() {
                FreeLibrary(h_sqlite);
                return Err("Failed to open SQLite database".into());
            }

            let sql_sel = to_wide("SELECT key, value FROM ProtobufItems WHERE key != 'Checksum' ORDER BY CAST(key AS INTEGER)");
            let mut stmt: *mut std::ffi::c_void = std::ptr::null_mut();
            if prep(db, sql_sel.as_ptr(), -1, &mut stmt, std::ptr::null_mut()) != 0 {
                close(db);
                FreeLibrary(h_sqlite);
                return Err("Failed to prepare SELECT statement".into());
            }

            let mut rows: Vec<(String, Vec<u8>)> = Vec::new();
            while step(stmt) == 100 {
                let p_key = col_blob(stmt, 0);
                let len_key = col_bytes(stmt, 0) as usize;
                let key_str = if !p_key.is_null() && len_key > 0 {
                    let s = String::from_utf8_lossy(std::slice::from_raw_parts(p_key, len_key)).to_string();
                    s.trim_matches('\0').trim().to_string()
                } else {
                    String::new()
                };

                let p_val = col_blob(stmt, 1);
                let len_val = col_bytes(stmt, 1) as usize;
                let val_bytes = if !p_val.is_null() && len_val > 0 {
                    std::slice::from_raw_parts(p_val, len_val).to_vec()
                } else {
                    Vec::new()
                };

                rows.push((key_str, val_bytes));
            }
            finalize(stmt);

            // Clean any dummy 11111111 profile
            rows.retain(|(k, v)| k != "4" && !v.windows(b"11111111".len()).any(|w| w == b"11111111"));
            let sql_del_dummy = to_wide("DELETE FROM ProtobufItems WHERE key='4' OR value LIKE '%11111111%'");
            let mut stmt_del: *mut std::ffi::c_void = std::ptr::null_mut();
            if prep(db, sql_del_dummy.as_ptr(), -1, &mut stmt_del, std::ptr::null_mut()) == 0 {
                step(stmt_del);
                finalize(stmt_del);
            }

            // Dynamically extract env_uuid and profile_uuid from existing Key 3 or other items
            let mut env_uuid = None;
            let mut profile_uuid = None;

            for (k, v) in &rows {
                if k == "3" || v.windows(b"Activate Push-to-Talk".len()).any(|w| w == b"Activate Push-to-Talk") {
                    let (e, p) = extract_uuids_from_hotkey_proto(v);
                    if env_uuid.is_none() { env_uuid = e; }
                    if profile_uuid.is_none() { profile_uuid = p; }
                }
            }

            // Check Profiles table if profile_uuid still not found
            if profile_uuid.is_none() {
                let sql_chk_prof = to_wide("SELECT value FROM Profiles WHERE key='DefaultHotkeyProfile'");
                let mut stmt_cp: *mut std::ffi::c_void = std::ptr::null_mut();
                if prep(db, sql_chk_prof.as_ptr(), -1, &mut stmt_cp, std::ptr::null_mut()) == 0 {
                    if step(stmt_cp) == 100 {
                        let pb = col_blob(stmt_cp, 0);
                        let l = col_bytes(stmt_cp, 0) as usize;
                        if !pb.is_null() && l == 36 {
                            let s = String::from_utf8_lossy(std::slice::from_raw_parts(pb, l)).to_string();
                            if s != "ffffffff-ffff-ffff-ffff-ffffffffffff" && s != "8dfc6a1e-7aaf-e6f8-1d75-e51ccbd3837b" {
                                profile_uuid = Some(s);
                            }
                        }
                    }
                    finalize(stmt_cp);
                }
            }

            let p_uuid = profile_uuid.unwrap_or_else(|| "2f2a236a-35de-891d-0ad2-8da0ab3e1f51".to_string());
            let e_uuid = env_uuid.unwrap_or_else(|| "ea77046a-b5cf-ff1e-0eeb-5cfed1ac51aa".to_string());

            let new_proto = build_ts3_hotkey_protobuf(&e_uuid, &p_uuid, new_raw_key, new_key_code);

            // Find existing row for hotkeys or key 3
            let mut target_idx = None;
            for (i, (k, v)) in rows.iter().enumerate() {
                if k == "3" || v.windows(b"Activate Push-to-Talk".len()).any(|w| w == b"Activate Push-to-Talk") {
                    target_idx = Some(i);
                    break;
                }
            }

            let key_to_update: String;
            if let Some(idx) = target_idx {
                key_to_update = rows[idx].0.trim_matches('\0').trim().to_string();
                rows[idx].1 = new_proto.clone();
            } else {
                key_to_update = "3".to_string();
                rows.push(("3".to_string(), new_proto.clone()));
            }

            let sql_upd = to_wide(&format!("INSERT OR REPLACE INTO ProtobufItems (timestamp, key, value) VALUES (strftime('%s','now'), '{}', ?)", key_to_update));
            let mut stmt_upd: *mut std::ffi::c_void = std::ptr::null_mut();
            if prep(db, sql_upd.as_ptr(), -1, &mut stmt_upd, std::ptr::null_mut()) == 0 {
                bind_blob(stmt_upd, 1, new_proto.as_ptr(), new_proto.len() as i32, std::ptr::null_mut());
                step(stmt_upd);
                finalize(stmt_upd);
            }

            // Preserve all existing bookmarks and other rows without mutation

            // Recompute Checksum over all non-checksum items
            rows.sort_by_key(|(k, _)| k.parse::<i32>().unwrap_or(999));
            let mut all_data = Vec::new();
            for (_k, v) in &rows {
                all_data.extend_from_slice(v);
            }
            let new_checksum = sha1_digest(&all_data);

            let sql_chk = to_wide("INSERT OR REPLACE INTO ProtobufItems (timestamp, key, value) VALUES (strftime('%s','now'), 'Checksum', ?)");
            let mut stmt_chk: *mut std::ffi::c_void = std::ptr::null_mut();
            if prep(db, sql_chk.as_ptr(), -1, &mut stmt_chk, std::ptr::null_mut()) == 0 {
                bind_blob(stmt_chk, 1, new_checksum.as_ptr(), 20, std::ptr::null_mut());
                step(stmt_chk);
                finalize(stmt_chk);
            }

            // Sync Application, Connecting, Profiles, and Silence Unwanted Popups
            let sync_stmts = [
                format!("INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'HotkeyProfile', '{}')", p_uuid),
                format!("INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'HotkeyMode', '2')"),
                format!("DELETE FROM Connecting WHERE key='LastUsedServerHotkeyProfile'"),
                format!("INSERT OR REPLACE INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerHotkeyProfile', '{}')", p_uuid),
                format!("INSERT OR REPLACE INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultHotkeyProfile', '{}')", p_uuid),
                "INSERT OR REPLACE INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'Capture/Default/PreProcessing', 'agc=true\ncontinous_transmission=false\nvad_over_ptt=false\ndenoiser_level=1\nvoiceactivation_level=-40\ntyping_suppression=false\necho_reduction_db=0\necho_reduction=false\ndelay_ptt=true\ndelay_ptt_msecs=300\nvad_mode=0\necho_cancellation=false\ndenoise=true\nvad=false')".to_string(),
                "CREATE TABLE IF NOT EXISTS Ask (timestamp INTEGER, key TEXT PRIMARY KEY, value TEXT)".to_string(),
                "INSERT OR REPLACE INTO Ask (timestamp, key, value) VALUES (strftime('%s','now'), 'moderatedchannelinfo', 'false')".to_string(),
                "INSERT OR REPLACE INTO General (timestamp, key, value) VALUES (strftime('%s','now'), 'moderatedchannelinfo', 'false')".to_string(),
                "INSERT OR REPLACE INTO Application (timestamp, key, value) VALUES (strftime('%s','now'), 'moderatedchannelinfo', 'false')".to_string(),
            ];
            for stmt_s in &sync_stmts {
                let sql_sync = to_wide(stmt_s);
                let mut stmt_run: *mut std::ffi::c_void = std::ptr::null_mut();
                if prep(db, sql_sync.as_ptr(), -1, &mut stmt_run, std::ptr::null_mut()) == 0 {
                    step(stmt_run);
                    finalize(stmt_run);
                }
            }

            close(db);
        }

        FreeLibrary(h_sqlite);
        Ok(())
    }
}







fn emit_ts3_prog(app: &tauri::AppHandle, progress: u32, status: &str, hint: &str) {



    use tauri::Emitter;



    let _ = app.emit("ts3-progress", Ts3ProgressEvent {



        progress,



        status: status.to_string(),



        hint: hint.to_string(),



    });



}







#[tauri::command]



async fn check_ts3_status_backend() -> Result<Ts3Status, String> {



    tauri::async_runtime::spawn_blocking(|| {



        let ts_exe = find_teamspeak_exe(None);



        let installed = ts_exe.is_some();



        let ts3_version = if installed {



            "3.6.2 (64-BIT)".to_string()



        } else {



            "NOT INSTALLED".to_string()



        };







        // Check-only: Do not modify settings.db or lock files during periodic polling







        let mut salty_installed = false;







        let mut candidate_dirs: Vec<PathBuf> = Vec::new();



        if let Ok(appdata) = std::env::var("APPDATA") {



            candidate_dirs.push(PathBuf::from(&appdata).join(r"TS3Client\plugins"));



        }



        if let Some(ref exe) = ts_exe {



            if let Some(parent) = exe.parent() {



                candidate_dirs.push(parent.join("plugins"));



            }



        }



        candidate_dirs.push(PathBuf::from(r"C:\Program Files\TeamSpeak 3 Client\plugins"));



        candidate_dirs.push(PathBuf::from(r"C:\Program Files (x86)\TeamSpeak 3 Client\plugins"));







        if installed {



            for dir in &candidate_dirs {



                let dll64 = dir.join("SaltyChat_win64.dll");



                let dll32 = dir.join("SaltyChat_win32.dll");



                if dll64.exists() || dll32.exists() {



                    salty_installed = true;



                    break;



                }



            }







            // Auto-heal SaltyChat if TS3 is installed but SaltyChat DLL is missing



            if !salty_installed {



                let _ = deploy_saltychat_plugin(None, &candidate_dirs);



                for dir in &candidate_dirs {



                    let dll64 = dir.join("SaltyChat_win64.dll");



                    let dll32 = dir.join("SaltyChat_win32.dll");



                    if dll64.exists() || dll32.exists() {



                        salty_installed = true;



                        break;



                    }



                }



            }



        } else {



            salty_installed = false;



        }







        let mut proximity_key = "MOUSE 4".to_string();



        for db in get_ts3_db_candidates() {



            if let Some(k) = read_ts3_proximity_key_from_db(&db) {



                proximity_key = k;



                break;



            }



        }







        let salty_version = if installed && salty_installed {



            "4.1.0".to_string()



        } else {



            "NOT INSTALLED".to_string()



        };







        Ok(Ts3Status {



            installed,



            ts3_version,



            salty_installed,



            salty_version,



            proximity_key,



        })



    }).await.map_err(|e| e.to_string())?



}











// --- TS3 AUDIO HARDWARE DEVICE MANAGER ---



#[derive(serde::Serialize, Clone, Debug)]



pub struct AudioDeviceItem {



    pub name: String,



    pub id: String,



}







#[derive(serde::Serialize, Clone, Debug)]



pub struct AudioDevicesResponse {



    pub input_devices: Vec<AudioDeviceItem>,



    pub output_devices: Vec<AudioDeviceItem>,



    pub current_input_id: String,



    pub current_output_id: String,



}







fn enumerate_audio_devices_registry(is_input: bool) -> Vec<AudioDeviceItem> {



    let mut list = Vec::new();



    let subkey_name = if is_input {



        r"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture"



    } else {



        r"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render"



    };



    let prefix = if is_input { "{0.0.1.00000000}" } else { "{0.0.0.00000000}" };







    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);



    if let Ok(base_key) = hklm.open_subkey(subkey_name) {



        for guid in base_key.enum_keys().filter_map(|k| k.ok()) {



            if let Ok(dev_key) = base_key.open_subkey(&guid) {



                let state: u32 = dev_key.get_value("DeviceState").unwrap_or(0);



                if state == 1 {



                    if let Ok(prop_key) = dev_key.open_subkey("Properties") {



                        let interface_name: String = prop_key.get_value("{a45c254e-df1c-4efd-8020-67d146a850e0},2").unwrap_or_default();



                        let endpoint_name: String = prop_key.get_value("{b3f8fa53-0004-438e-9003-51a46e139bfc},6").unwrap_or_default();



                        let display_name = if !interface_name.is_empty() && !endpoint_name.is_empty() {



                            format!("{} ({})", interface_name, endpoint_name)



                        } else if !endpoint_name.is_empty() {



                            endpoint_name



                        } else if !interface_name.is_empty() {



                            interface_name



                        } else {



                            continue;



                        };



                        let full_id = format!("{}.{}", prefix, guid);



                        list.push(AudioDeviceItem {



                            id: full_id,



                            name: display_name,



                        });



                    }



                }



            }



        }



    }



    list



}







fn execute_sqlite_statements_on_dbs(candidate_dbs: &[PathBuf], statements: &[&str]) {



    unsafe {



        let dll_name = to_wide("winsqlite3.dll");



        let h_sqlite = LoadLibraryW(dll_name.as_ptr());



        if h_sqlite.is_null() {



            return;



        }







        type Sqlite3Open16 = unsafe extern "system" fn(*const u16, *mut *mut std::ffi::c_void) -> i32;



        type Sqlite3Prepare16V2 = unsafe extern "system" fn(*mut std::ffi::c_void, *const u16, i32, *mut *mut std::ffi::c_void, *mut *const u16) -> i32;



        type Sqlite3Step = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;



        type Sqlite3Finalize = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;



        type Sqlite3Close = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;







        let fn_open: Option<Sqlite3Open16> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_open16\0".as_ptr()));



        let fn_prep: Option<Sqlite3Prepare16V2> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_prepare16_v2\0".as_ptr()));



        let fn_step: Option<Sqlite3Step> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_step\0".as_ptr()));



        let fn_finalize: Option<Sqlite3Finalize> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_finalize\0".as_ptr()));



        let fn_close: Option<Sqlite3Close> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_close\0".as_ptr()));







        if let (Some(open), Some(prep), Some(step), Some(finalize), Some(close)) = (fn_open, fn_prep, fn_step, fn_finalize, fn_close) {



            for db_path in candidate_dbs {



                if let Some(parent) = db_path.parent() {



                    let _ = fs::create_dir_all(parent);



                }



                let path_wide = to_wide(&db_path.to_string_lossy());



                let mut db: *mut std::ffi::c_void = std::ptr::null_mut();



                if open(path_wide.as_ptr(), &mut db) == 0 && !db.is_null() {



                    for stmt_str in statements {



                        let stmt_wide = to_wide(stmt_str);



                        let mut stmt: *mut std::ffi::c_void = std::ptr::null_mut();



                        if prep(db, stmt_wide.as_ptr(), -1, &mut stmt, std::ptr::null_mut()) == 0 && !stmt.is_null() {



                            step(stmt);



                            finalize(stmt);



                        }



                    }



                    close(db);



                }



            }



        }



        FreeLibrary(h_sqlite);



    }



}







fn read_current_audio_devices_from_db() -> (String, String) {



    let mut input_name = String::new();



    let mut output_name = String::new();



    let mut input_display = String::new();



    let mut output_display = String::new();







    let candidate_dbs = get_ts3_db_candidates();



    unsafe {



        let dll_name = to_wide("winsqlite3.dll");



        let h_sqlite = LoadLibraryW(dll_name.as_ptr());



        if h_sqlite.is_null() {



            return (input_name, output_name);



        }







        type Sqlite3Open16 = unsafe extern "system" fn(*const u16, *mut *mut std::ffi::c_void) -> i32;



        type Sqlite3Close = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;



        type Sqlite3Prepare16V2 = unsafe extern "system" fn(*mut std::ffi::c_void, *const u16, i32, *mut *mut std::ffi::c_void, *mut *const u16) -> i32;



        type Sqlite3Step = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;



        type Sqlite3ColumnText = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> *const std::ffi::c_char;



        type Sqlite3Finalize = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;







        let open: Option<Sqlite3Open16> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_open16\0".as_ptr()));



        let close: Option<Sqlite3Close> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_close\0".as_ptr()));



        let prep: Option<Sqlite3Prepare16V2> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_prepare16_v2\0".as_ptr()));



        let step: Option<Sqlite3Step> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_step\0".as_ptr()));



        let col_text: Option<Sqlite3ColumnText> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_column_text\0".as_ptr()));



        let finalize: Option<Sqlite3Finalize> = std::mem::transmute(GetProcAddress(h_sqlite, b"sqlite3_finalize\0".as_ptr()));







        if let (Some(open), Some(close), Some(prep), Some(step), Some(col_text), Some(finalize)) = 



            (open, close, prep, step, col_text, finalize) {



            let sql_w = to_wide("SELECT key, value FROM Profiles WHERE key='Capture/Default' OR key='Playback/Default'");



            for db_path in candidate_dbs {



                if !db_path.exists() {



                    continue;



                }



                let path_w = to_wide(&db_path.to_string_lossy());



                let mut db: *mut std::ffi::c_void = std::ptr::null_mut();



                if open(path_w.as_ptr(), &mut db) == 0 && !db.is_null() {



                    let mut stmt: *mut std::ffi::c_void = std::ptr::null_mut();



                    if prep(db, sql_w.as_ptr(), -1, &mut stmt, std::ptr::null_mut()) == 0 {



                        while step(stmt) == 100 {



                            let k_ptr = col_text(stmt, 0);



                            let v_ptr = col_text(stmt, 1);



                            if !k_ptr.is_null() && !v_ptr.is_null() {



                                let k_str = std::ffi::CStr::from_ptr(k_ptr).to_string_lossy();



                                let v_str = std::ffi::CStr::from_ptr(v_ptr).to_string_lossy();



                                let mut dev_id = String::new();



                                let mut dev_disp = String::new();



                                for line in v_str.lines() {



                                    let trimmed = line.trim();



                                    if let Some(stripped) = trimmed.strip_prefix("Device=") {



                                        dev_id = stripped.trim().to_string();



                                    } else if let Some(stripped) = trimmed.strip_prefix("DeviceDisplayName=") {



                                        dev_disp = stripped.trim().to_string();



                                    }



                                }



                                if k_str == "Capture/Default" {



                                    input_name = dev_id;



                                    input_display = dev_disp;



                                } else if k_str == "Playback/Default" {



                                    output_name = dev_id;



                                    output_display = dev_disp;



                                }



                            }



                        }



                        finalize(stmt);



                    }



                    close(db);



                    if !input_name.is_empty() || !output_name.is_empty() {



                        break;



                    }



                }



            }



        }



        FreeLibrary(h_sqlite);



    }







    if input_name.is_empty() && !input_display.is_empty() {



        let inputs = enumerate_audio_devices_registry(true);



        if let Some(m) = inputs.iter().find(|d| d.name.eq_ignore_ascii_case(&input_display)) {



            input_name = m.id.clone();



        }



    }



    if output_name.is_empty() && !output_display.is_empty() {



        let outputs = enumerate_audio_devices_registry(false);



        if let Some(m) = outputs.iter().find(|d| d.name.eq_ignore_ascii_case(&output_display)) {



            output_name = m.id.clone();



        }



    }







    (input_name, output_name)



}







fn update_ts3_audio_device_in_db(device_type: &str, device_name: &str, device_id: &str) -> Result<bool, String> {
    let safe_name = device_name.replace('"', "''").replace('\'', "''");
    let safe_id = device_id.replace('"', "''").replace('\'', "''");
    let candidate_dbs = get_ts3_db_candidates();

    if device_type == "input" {
        let cap_val = if safe_id.is_empty() {
            "DeviceDisplayName=\nDevice=\nMode=".to_string()
        } else {
            format!("DeviceDisplayName={}\nDevice={}\nMode=", safe_name, safe_id)
        };
        let stmts = [
            "CREATE TABLE IF NOT EXISTS Profiles (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)",
            "CREATE TABLE IF NOT EXISTS Connecting (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)",
            "DELETE FROM Profiles WHERE key='Capture/Default'",
            &format!("INSERT INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'Capture/Default', '{}')", cap_val),
            "DELETE FROM Profiles WHERE key='DefaultCaptureProfile'",
            "INSERT INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultCaptureProfile', 'Default')",
            "DELETE FROM Connecting WHERE key='LastUsedServerCaptureProfile'",
            "INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerCaptureProfile', 'Default')",
            "INSERT OR REPLACE INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'Capture/Default/PreProcessing', 'agc=true\ncontinous_transmission=false\nvad_over_ptt=false\ndenoiser_level=1\nvoiceactivation_level=-40\ntyping_suppression=false\necho_reduction_db=0\necho_reduction=false\ndelay_ptt=true\ndelay_ptt_msecs=300\nvad_mode=0\necho_cancellation=false\ndenoise=true\nvad=false')",
        ];
        execute_sqlite_statements_on_dbs(&candidate_dbs, &stmts);
    } else {
        let play_val = if safe_id.is_empty() {
            "MonoSoundExpansion=2\nVolumeModifier=0\nDeviceDisplayName=\nVolumeFactorWaveDb=0\nPlayMicClicksOnOwn=false\nPlaybackMonoOverCenterSpeaker=false\nPlayMicClicksOnOthers=false\nComfortNoiseVolume=-60\nDevice=\nComfortNoiseEnabled=false\nAGC=true\nMode=".to_string()
        } else {
            format!("MonoSoundExpansion=2\nVolumeModifier=0\nDeviceDisplayName={}\nVolumeFactorWaveDb=0\nPlayMicClicksOnOwn=false\nPlaybackMonoOverCenterSpeaker=false\nPlayMicClicksOnOthers=false\nComfortNoiseVolume=-60\nDevice={}\nComfortNoiseEnabled=false\nAGC=true\nMode=", safe_name, safe_id)
        };
        let stmts = [
            "CREATE TABLE IF NOT EXISTS Profiles (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)",
            "CREATE TABLE IF NOT EXISTS Connecting (timestamp INTEGER UNSIGNED, key VARCHAR, value VARCHAR)",
            "DELETE FROM Profiles WHERE key='Playback/Default'",
            &format!("INSERT INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'Playback/Default', '{}')", play_val),
            "DELETE FROM Profiles WHERE key='DefaultPlaybackProfile'",
            "INSERT INTO Profiles (timestamp, key, value) VALUES (strftime('%s','now'), 'DefaultPlaybackProfile', 'Default')",
            "DELETE FROM Connecting WHERE key='LastUsedServerPlaybackProfile'",
            "INSERT INTO Connecting (timestamp, key, value) VALUES (strftime('%s','now'), 'LastUsedServerPlaybackProfile', 'Default')",
        ];
        execute_sqlite_statements_on_dbs(&candidate_dbs, &stmts);
    }

    Ok(true)
}







#[tauri::command]



async fn get_ts3_audio_devices_backend() -> Result<AudioDevicesResponse, String> {



    tauri::async_runtime::spawn_blocking(|| {



        let mut input_devices = vec![AudioDeviceItem {



            name: "Default (System Default Microphone)".to_string(),



            id: "".to_string(),



        }];



        input_devices.extend(enumerate_audio_devices_registry(true));







        let mut output_devices = vec![AudioDeviceItem {



            name: "Default (System Default Speakers/Headset)".to_string(),



            id: "".to_string(),



        }];



        output_devices.extend(enumerate_audio_devices_registry(false));







        let (current_input_id, current_output_id) = read_current_audio_devices_from_db();







        Ok(AudioDevicesResponse {



            input_devices,



            output_devices,



            current_input_id,



            current_output_id,



        })



    }).await.map_err(|e| e.to_string())?



}







#[tauri::command]



async fn set_ts3_audio_device_backend(device_type: String, device_name: String, device_id: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if device_type != "input" && device_type != "output" {
            return Err("Unknown TeamSpeak audio device type.".to_string());
        }

        let saved = update_ts3_audio_device_in_db(&device_type, &device_name, &device_id)?;
        Ok(saved)
    }).await.map_err(|e| e.to_string())?
}







#[tauri::command]
async fn set_ts3_proximity_key_backend(key_name: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (display_label, vk_code) = map_key_name_to_label_and_vk(&key_name);
        
        // 1. Send live pipe update FIRST for 0ms instant response in TS3!
        let pipe_cmd = format!("SET_KEY:{}:{}", display_label, vk_code);
        send_to_goldstone_pipe(&pipe_cmd);

        // 2. Immediate in-memory active key update
        ACTIVE_PTT_VK.store(vk_code, std::sync::atomic::Ordering::SeqCst);

        // 3. Persist to goldstone_ptt_key.txt (both APPDATA and local)
        if let Ok(appdata) = std::env::var("APPDATA") {
            let client_dir = Path::new(&appdata).join("TS3Client");
            let _ = fs::create_dir_all(&client_dir);
            let key_txt = client_dir.join("goldstone_ptt_key.txt");
            let _ = fs::write(&key_txt, format!("{}:{}", display_label, vk_code));
        }
        let _ = fs::write("goldstone_ptt_key.txt", format!("{}:{}", display_label, vk_code));

        // 4. Update settings.db with Goldstone:ptt (Action type 320 Push-to-Talk)
        let candidate_dbs: Vec<PathBuf> = get_ts3_db_candidates()
            .into_iter()
            .filter(|db| db.exists())
            .collect();
        if !candidate_dbs.is_empty() {
            for db in &candidate_dbs {
                let _ = update_ts3_ptt_key_in_db(db, "Goldstone:ptt", 0);
            }
        }

        // 5. Ensure plugin is deployed
        deploy_goldstone_ptt_plugin();

        Ok(display_label)
    }).await.map_err(|e| e.to_string())?
}

fn find_teamspeak_uninstaller() -> Option<PathBuf> {



    if let Some(exe) = find_teamspeak_exe(None) {



        if let Some(parent) = exe.parent() {



            let u1 = parent.join("Uninstall.exe");



            if u1.exists() { return Some(u1); }



            let u2 = parent.join("uninstall.exe");



            if u2.exists() { return Some(u2); }



        }



    }



    let candidates = [



        r"C:\Program Files\TeamSpeak 3 Client\Uninstall.exe",



        r"C:\Program Files (x86)\TeamSpeak 3 Client\Uninstall.exe",



    ];



    for c in &candidates {



        let p = PathBuf::from(c);



        if p.exists() { return Some(p); }



    }



    None



}







#[tauri::command]



async fn install_ts3_backend(app: tauri::AppHandle) -> Result<bool, String> {



    tauri::async_runtime::spawn_blocking(move || {
        let ts_exe = find_teamspeak_exe(None);
        let user_had_overwolf = check_user_has_overwolf();
        let (ow_stop_tx, ow_stop_rx) = std::sync::mpsc::channel();
        let mut ow_watchdog: Option<std::thread::JoinHandle<()>> = None;



        



        // 1. If TeamSpeak 3 is NOT installed, download and install it



        if ts_exe.is_none() {



            let downloads_dir = std::env::var("USERPROFILE")



                .map(|u| PathBuf::from(u).join("Downloads"))



                .unwrap_or_else(|_| std::env::temp_dir());



            let _ = fs::create_dir_all(&downloads_dir);



            let setup_dest = downloads_dir.join("TeamSpeak3-Client-win64-3.6.2.exe");







            let already_downloaded = if setup_dest.exists() {



                if let Ok(meta) = fs::metadata(&setup_dest) {



                    meta.len() > 100_000_000



                } else {



                    false



                }



            } else {



                false



            };







            if already_downloaded {



                emit_ts3_prog(



                    &app,



                    50,



                    "INSTALLER VERIFIED",



                    "Found complete TeamSpeak 3 installer in Downloads folder.",



                );



            } else {



                emit_ts3_prog(



                    &app,



                    5,



                    "CONNECTING TO TEAMSPEAK SERVERS...",



                    "Downloading to Downloads folder: TeamSpeak3-Client-win64-3.6.2.exe",



                );



                let (dyn_ts3_url, _) = get_voice_urls();



                let ts3_setup_url = dyn_ts3_url.as_str();



                let app_clone = app.clone();



                let download_res = download_file_with_progress(ts3_setup_url, &setup_dest, move |downloaded, total| {



                    let dl_mb = downloaded as f64 / 1_048_576.0;



                    let total_mb = if total > 0 { total as f64 / 1_048_576.0 } else { 107.8 };



                    let pct_dl = if total > 0 { (downloaded as f64 / total as f64 * 100.0).min(100.0) } else { 0.0 };



                    let overall_pct = 5 + (pct_dl * 0.45).round() as u32;



                    let status = format!("DOWNLOADING TEAMSPEAK 3 ({:.0}%)...", pct_dl);



                    let hint = format!("Downloaded {:.1} MB / {:.1} MB to Downloads folder", dl_mb, total_mb);



                    emit_ts3_prog(&app_clone, overall_pct, &status, &hint);



                });







                if let Err(e) = download_res {



                    return Err(format!("Failed to download TeamSpeak 3: {}", e));



                }



            }







            emit_ts3_prog(



                &app,



                55,



                "INSTALLING TEAMSPEAK 3 (64-BIT)...",



                "Please accept the Windows administrator prompt to install TeamSpeak 3...",



            );







            let setup_path_str = setup_dest.to_string_lossy().to_string();



            let parent_dir = setup_dest.parent().map(|p| p.to_string_lossy().to_string());



            let file_wide = to_wide(&setup_path_str);



            let dir_wide = parent_dir.as_ref().map(|d| to_wide(d));



            let params_wide = to_wide("/S");



            let op_wide = to_wide("runas");

            if !user_had_overwolf {
                ow_watchdog = Some(std::thread::spawn(move || {
                    while ow_stop_rx.try_recv().is_err() {
                        kill_processes_by_name(&["overwolf"]);
                        close_overwolf_overlay_windows();

                        if let Ok(temp) = std::env::var("TEMP") {
                            let ow_dir = PathBuf::from(&temp).join("overwolf_downloader");
                            if ow_dir.exists() {
                                let _ = fs::remove_dir_all(&ow_dir);
                            }

                            if let Ok(entries) = fs::read_dir(&temp) {
                                for entry in entries.flatten() {
                                    let path = entry.path();
                                    if path.is_dir() {
                                        let fname = path.file_name().unwrap_or_default().to_string_lossy().to_ascii_lowercase();
                                        if fname.starts_with("ns") && fname.ends_with(".tmp") {
                                            let ow1 = path.join("OverwolfInstallerDownloader.exe");
                                            if ow1.exists() {
                                                let _ = fs::remove_file(&ow1).or_else(|_| fs::write(&ow1, b""));
                                            }
                                            let ow2 = path.join("OverwolfTeamSpeakInstaller.exe");
                                            if ow2.exists() {
                                                let _ = fs::remove_file(&ow2).or_else(|_| fs::write(&ow2, b""));
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        std::thread::sleep(Duration::from_millis(30));
                    }
                }));
            }

            unsafe {



                let res = ShellExecuteW(



                    std::ptr::null_mut(),



                    op_wide.as_ptr(),



                    file_wide.as_ptr(),



                    params_wide.as_ptr(),



                    dir_wide.as_ref().map(|d| d.as_ptr()).unwrap_or(std::ptr::null()),



                    1,



                );



                if res <= 32 {



                    ShellExecuteW(



                        std::ptr::null_mut(),



                        std::ptr::null(),



                        file_wide.as_ptr(),



                        params_wide.as_ptr(),



                        dir_wide.as_ref().map(|d| d.as_ptr()).unwrap_or(std::ptr::null()),



                        1,



                    );



                }



            }







            // Pre-emptively remove temporary overwolf downloader folder



            if let Ok(temp) = std::env::var("TEMP") {



                let ow_dir = PathBuf::from(&temp).join("overwolf_downloader");



                if ow_dir.exists() {



                    let _ = fs::remove_dir_all(&ow_dir);



                }



            }







            // Poll for up to 120 seconds while installer is running
            let poll_start = std::time::Instant::now();
            let mut installed = false;
            while poll_start.elapsed() < Duration::from_secs(120) {
                let setup_running = is_process_running_fuzzy("TeamSpeak3-Client");
                if find_teamspeak_exe(None).is_some() {
                    installed = true;
                    if !setup_running {
                        break;
                    }
                }
                std::thread::sleep(Duration::from_millis(500));
            }







            // Copy pre-configured turnkey settings.db if none exists yet or if it lacks Goldstone



            if let Ok(appdata) = std::env::var("APPDATA") {



                let dest_db = PathBuf::from(&appdata).join(r"TS3Client\settings.db");



                let mut candidates = Vec::new();



                candidates.push(PathBuf::from(r"TS3_AutoSetup\TS3Config\settings.db"));



                if let Ok(exe) = std::env::current_exe() {



                    if let Some(parent) = exe.parent() {



                        candidates.push(parent.join(r"TS3_AutoSetup\TS3Config\settings.db"));



                    }



                }



                let mut found_src = None;



                for c in &candidates {



                    if c.exists() {



                        found_src = Some(c.clone());



                        break;



                    }



                }







                if let Some(src_db) = found_src {



                    let needs_copy = !dest_db.exists();







                    if needs_copy {



                        if let Some(parent) = dest_db.parent() {



                            let _ = fs::create_dir_all(parent);



                        }



                        let _ = fs::copy(&src_db, &dest_db);



                    }



                }



            }







            // Allow final disk flush, then scrub any Overwolf remnant
            std::thread::sleep(Duration::from_millis(1000));
            prevent_and_clean_overwolf_internal(user_had_overwolf);

            if !installed {
                let _ = ow_stop_tx.send(());
                if let Some(w) = ow_watchdog {
                    let _ = w.join();
                }
                prevent_and_clean_overwolf_internal(user_had_overwolf);
                emit_ts3_prog(
                    &app,
                    0,
                    "INSTALLATION PENDING",
                    "TeamSpeak 3 setup was not finished. Click Install to run setup again.",
                );
                return Ok(false);
            }







            // Brief wait to ensure installation files and registry finish finalizing



            std::thread::sleep(Duration::from_millis(1500));



        } else {



            emit_ts3_prog(&app, 30, "TEAMSPEAK 3 DETECTED", "Client verified. Installing official SaltyChat plugin...");



        }







        // Close any running TS3 processes before file deployment



        kill_processes_by_name(&["ts3client_win64.exe", "ts3client_win32.exe"]);



        std::thread::sleep(Duration::from_millis(300));







        // 2. Install SaltyChat Plugin v4.1.0 (Embedded Standalone Package)



        emit_ts3_prog(&app, 60, "INSTALLING SALTYCHAT v4.1.0...", "Extracting official 3D spatial audio plugin...");



        



        let mut target_dirs: Vec<PathBuf> = Vec::new();



        if let Ok(appdata) = std::env::var("APPDATA") {



            let p = PathBuf::from(&appdata).join(r"TS3Client\plugins");



            let _ = fs::create_dir_all(&p);



            target_dirs.push(p);



        }



        if let Some(exe) = find_teamspeak_exe(None) {



            if let Some(parent) = exe.parent() {



                let p = parent.join("plugins");



                let _ = fs::create_dir_all(&p);



                target_dirs.push(p);



            }



        }



        let std_pf = PathBuf::from(r"C:\Program Files\TeamSpeak 3 Client\plugins");



        if std_pf.parent().map(|p| p.exists()).unwrap_or(false) && !target_dirs.contains(&std_pf) {



            let _ = fs::create_dir_all(&std_pf);



            target_dirs.push(std_pf);



        }







        let copied = deploy_saltychat_plugin(Some(&app), &target_dirs).unwrap_or(false);



        // 3. Configure audio profile, suppress license agreement & disable Overwolf overlay



        emit_ts3_prog(&app, 85, "CONFIGURING AUDIO PROFILE & LICENSES...", "Accepting license agreements & configuring audio profile...");
        configure_teamspeak_profile(None);

        let _ = ow_stop_tx.send(());
        if let Some(w) = ow_watchdog {
            let _ = w.join();
        }
        prevent_and_clean_overwolf_internal(user_had_overwolf);

        emit_ts3_prog(&app, 100, "VOICE READY • ALL SYSTEMS UP TO DATE", "TeamSpeak 3 & SaltyChat are ready for Goldstone County RP.");



        Ok(copied || find_teamspeak_exe(None).is_some())



    }).await.map_err(|e| e.to_string())?



}







#[tauri::command]



async fn uninstall_ts3_backend(app: tauri::AppHandle) -> Result<bool, String> {



    tauri::async_runtime::spawn_blocking(move || {



        emit_ts3_prog(&app, 20, "CLOSING TEAMSPEAK...", "Closing voice client processes...");



        kill_processes_by_name(&["ts3client_win64.exe", "ts3client_win32.exe"]);



        std::thread::sleep(std::time::Duration::from_millis(500));







        emit_ts3_prog(&app, 45, "REMOVING SALTYCHAT PLUGIN...", "Cleaning plugin binaries...");



        if let Ok(appdata) = std::env::var("APPDATA") {



            let p = PathBuf::from(&appdata).join(r"TS3Client\plugins");



            let _ = fs::remove_file(p.join("SaltyChat_win64.dll"));



            let _ = fs::remove_file(p.join("SaltyChat_win32.dll"));



            let _ = fs::remove_file(p.join("SaltyChat_win64.pdb"));



            let _ = fs::remove_dir_all(p.join("SaltyChat"));



        }



        if let Some(exe) = find_teamspeak_exe(None) {



            if let Some(parent) = exe.parent() {



                let p = parent.join("plugins");



                let _ = fs::remove_file(p.join("SaltyChat_win64.dll"));



                let _ = fs::remove_file(p.join("SaltyChat_win32.dll"));



                let _ = fs::remove_file(p.join("SaltyChat_win64.pdb"));



                let _ = fs::remove_dir_all(p.join("SaltyChat"));



            }



        }



        for base in [



            PathBuf::from(r"C:\Program Files\TeamSpeak 3 Client\plugins"),



            PathBuf::from(r"C:\Program Files (x86)\TeamSpeak 3 Client\plugins"),



        ] {



            let _ = fs::remove_file(base.join("SaltyChat_win64.dll"));



            let _ = fs::remove_file(base.join("SaltyChat_win32.dll"));



            let _ = fs::remove_file(base.join("SaltyChat_win64.pdb"));



            let _ = fs::remove_dir_all(base.join("SaltyChat"));



        }







        emit_ts3_prog(&app, 70, "UNINSTALLING TEAMSPEAK 3...", "Opening TeamSpeak 3 uninstaller in installation directory...");



        if let Some(uninstaller) = find_teamspeak_uninstaller() {



            let uninstaller_path = uninstaller.to_string_lossy().to_string();



            let parent_dir = uninstaller.parent().map(|p| p.to_string_lossy().to_string());



            let file_wide = to_wide(&uninstaller_path);



            let dir_wide = parent_dir.as_ref().map(|d| to_wide(d));







            unsafe {



                ShellExecuteW(



                    std::ptr::null_mut(),



                    std::ptr::null(),



                    file_wide.as_ptr(),



                    std::ptr::null(),



                    dir_wide.as_ref().map(|d| d.as_ptr()).unwrap_or(std::ptr::null()),



                    1,



                );



            }



        }







        emit_ts3_prog(&app, 100, "UNINSTALL LAUNCHED", "SaltyChat cleaned and TeamSpeak 3 uninstaller opened in installation directory.");



        Ok(true)



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



async fn kill_processes_backend(app: tauri::AppHandle, kill_redm: Option<bool>, kill_ts3: Option<bool>) {
    let do_kill_redm = kill_redm.unwrap_or(true);
    let do_kill_ts3 = kill_ts3.unwrap_or(false);

    tauri::async_runtime::spawn_blocking(move || {
        let now_ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        LAST_LAUNCH_TIME.store(now_ts, Ordering::SeqCst);

        if do_kill_ts3 {
            // 1. Send DISCONNECT to our live in-process plugin first so all servers disconnect cleanly
            let _ = send_to_goldstone_pipe("DISCONNECT");

            // 2. ClientQuery disconnect all servers command (if port 25639 is open)
            if let Ok(mut stream) = std::net::TcpStream::connect_timeout(
                &std::net::SocketAddr::from(([127, 0, 0, 1], 25639)),
                std::time::Duration::from_millis(80)
            ) {
                use std::io::Write;
                let _ = stream.write_all(b"serverdisconnect -all\nquit\n");
            }

            // 3. Gracefully post WM_CLOSE to any TS3 window
            unsafe {
                let class_name = to_wide("Qt5QWindowIcon");
                let hwnd = FindWindowW(class_name.as_ptr(), std::ptr::null());
                if !hwnd.is_null() && hwnd as isize != -1 {
                    PostMessageW(hwnd, 0x0010 /* WM_CLOSE */, 0, 0);
                }
            }

            // 4. Adequate grace period for server disconnect packet transmission over network
            std::thread::sleep(std::time::Duration::from_millis(600));

            // 5. Signal plugin to exit cleanly
            let _ = send_to_goldstone_pipe("DISCONNECT_AND_EXIT");
            std::thread::sleep(std::time::Duration::from_millis(250));

            // 6. Terminate TS3 process only if still lingering
            kill_processes_by_name(&["ts3client_win64.exe"]);
        }

        if do_kill_redm {
            kill_processes_by_name(&["RedM.exe", "RDR2.exe"]);
        }

        let msg = if do_kill_redm && do_kill_ts3 {
            "REDM & TS3 CLOSED"
        } else if do_kill_ts3 {
            "TS3 CLOSED (DISCONNECTED)"
        } else {
            "REDM CLOSED"
        };
        let _ = app.emit("reset-trigger", msg);
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







// --- RESHADE ENGINE ---



#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]



pub struct ReShadeStatus {



    pub installed: bool,



    pub preset_name: String,



    pub shaders_count: usize,



    pub toggle_key: String,



    pub toggle_key_code: u32,



}







#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]



pub struct ReShadeProgress {



    pub percent: u32,



    pub step: String,



    pub status: String,



    pub done: bool,



    pub completed: bool,



    pub error: Option<String>,



}







fn get_redm_subprocess_dir() -> Option<PathBuf> {



    let local = std::env::var("LOCALAPPDATA").ok()?;



    let path = Path::new(&local).join(r"RedM\RedM.app\data\cache\subprocess");



    Some(path)



}







fn emit_reshade_prog(app: &tauri::AppHandle, percent: u32, step: &str, status: &str, done: bool, error: Option<String>) {



    let _ = app.emit("reshade-progress", ReShadeProgress {



        percent,



        step: step.to_string(),



        status: status.to_string(),



        done,



        completed: done,



        error,



    });



}







fn download_file_with_progress<F>(url: &str, dest: &Path, mut on_progress: F) -> Result<(), String>



where



    F: FnMut(u64, u64),



{



    let client = reqwest::blocking::Client::builder()



        .timeout(Duration::from_secs(300))



        .build()



        .map_err(|e| e.to_string())?;







    let mut resp = client.get(url).send().map_err(|e| e.to_string())?;



    if !resp.status().is_success() {



        return Err(format!("Download failed: HTTP {}", resp.status()));



    }







    let total_size = resp.content_length().unwrap_or(0);



    let mut file = File::create(dest).map_err(|e| e.to_string())?;







    let mut downloaded: u64 = 0;



    let mut buffer = [0u8; 64 * 1024];



    let mut last_emit = std::time::Instant::now();







    use std::io::{Read, Write};



    loop {



        let bytes_read = resp.read(&mut buffer).map_err(|e| e.to_string())?;



        if bytes_read == 0 {



            break;



        }



        file.write_all(&buffer[..bytes_read]).map_err(|e| e.to_string())?;



        downloaded += bytes_read as u64;







        if last_emit.elapsed() >= Duration::from_millis(150) || (total_size > 0 && downloaded >= total_size) {



            on_progress(downloaded, total_size);



            last_emit = std::time::Instant::now();



        }



    }



    on_progress(downloaded, total_size);



    Ok(())



}







fn download_file_to(url: &str, dest: &Path) -> Result<(), String> {



    download_file_with_progress(url, dest, |_, _| {})



}







fn install_reshade_core_and_shaders(app: &tauri::AppHandle, graphics_api: &str, toggle_key_code: u32) -> Result<(), String> {



    emit_reshade_prog(app, 15, "1/4", "PREPARING RESHADE SETUP...", false, None);



    std::thread::sleep(Duration::from_millis(200));







    let sub_dir = get_redm_subprocess_dir().ok_or("RedM directory not found. Please launch RedM once.")?;



    let _ = fs::create_dir_all(&sub_dir);







    let reshade_core_url = "https://gscl.nimnabro.com/reshade/ReShade64.dll";



    let target_dxgi = sub_dir.join("dxgi.dll");



    let target_reshade64 = sub_dir.join("ReShade64.dll");







    let mut acquired = false;



    if let Ok(cur) = std::env::current_exe() {



        if let Some(p) = cur.parent() {



            let local_candidates = [



                p.join("ReShade64.dll"),



                p.join(r"reshaders test\ReShade64.dll"),



            ];



            for cand in &local_candidates {



                if cand.exists() {



                    let _ = fs::copy(cand, &target_dxgi);



                    let _ = fs::copy(cand, &target_reshade64);



                    acquired = true;



                    break;



                }



            }



        }



    }







    if !acquired {



        emit_reshade_prog(app, 25, "1/4", "DOWNLOADING RESHADE CORE...", false, None);



        download_file_to(reshade_core_url, &target_reshade64)?;



        let _ = fs::copy(&target_reshade64, &target_dxgi);



    }



    emit_reshade_prog(app, 35, "1/4", "RESHADE CORE READY.", false, None);



    std::thread::sleep(Duration::from_millis(200));







    emit_reshade_prog(app, 45, "2/4", "CONFIGURING REDM SETTINGS...", false, None);



    std::thread::sleep(Duration::from_millis(200));







    let sub_json = sub_dir.join("ReShade64.json");



    if graphics_api == "DX12" {



        let _ = fs::remove_file(&sub_json);



    } else {



        let json_content = format!(r#"{{



	"file_format_version": "1.0.0",



	"layer": {{



		"name": "VK_LAYER_reshade",



		"type": "GLOBAL",



		"library_path": "{}",



		"api_version": "1.3.268",



		"implementation_version": "1",



		"description": "Goldstone ReShade Graphics Layer"



	}}



}}"#, target_reshade64.to_string_lossy().replace('\\', "\\\\"));



        let _ = fs::write(&sub_json, json_content);







        let hkcu = RegKey::predef(HKEY_CURRENT_USER);



        if let Ok((key, _)) = hkcu.create_subkey(r"Software\Khronos\Vulkan\ImplicitLayers") {



            let json_path_str = sub_json.to_string_lossy().to_string();



            let _ = key.set_value(&json_path_str, &0u32);



        }



    }







    emit_reshade_prog(app, 55, "3/4", "DOWNLOADING SHADERS...", false, None);



    std::thread::sleep(Duration::from_millis(150));







    let shaders_dir = sub_dir.join(r"reshade-shaders\Shaders");



    let textures_dir = sub_dir.join(r"reshade-shaders\Textures");



    let _ = fs::create_dir_all(&shaders_dir);



    let _ = fs::create_dir_all(&textures_dir);







    let shader_files = [



        "CAS.fx", "Clarity.fx", "qUINT_common.fxh",



        "qUINT_lightroom.fx", "ReShade.fxh", "ReShadeUI.fxh", "Vignette.fx"



    ];







    let base_shader_url = "https://gscl.nimnabro.com/reshade/shaders";



    let total_shaders = shader_files.len();



    for (idx, file) in shader_files.iter().enumerate() {



        let target_file = shaders_dir.join(file);



        let pct = 55 + ((idx + 1) * 30 / total_shaders) as u32;



        emit_reshade_prog(app, pct, "3/4", &format!("DOWNLOADING SHADERS ({}%)...", pct), false, None);



        if !target_file.exists() {



            let url = format!("{}/{}", base_shader_url, file);



            let _ = download_file_to(&url, &target_file);



        }



        std::thread::sleep(Duration::from_millis(100));



    }







    emit_reshade_prog(app, 90, "4/4", "APPLYING CINEMATIC PRESET...", false, None);



    std::thread::sleep(Duration::from_millis(200));







    let preset_name = "Goldstone Enhanced (SZ).ini";



    let _ = fs::write(sub_dir.join(preset_name), GOLDSTONE_PRESET_INI);



    let _ = fs::write(sub_dir.join("ReShadePreset.ini"), GOLDSTONE_PRESET_INI);







    let ini_content = format!(r#"[GENERAL]



CurrentPresetPath=.\{}



PresetPath=.\{}



StartupPresetPath=.\{}



PresetFiles=.\{}



CurrentPreset=0



EffectSearchPaths=.\reshade-shaders\Shaders



TextureSearchPaths=.\reshade-shaders\Textures



IntermediateCachePath=.\reshade-shaders\Intermediate



PerformanceMode=0



NoReloadOnInit=0



PreprocessorDefinitions=FXAA_LINEAR_LIGHT=1,INFINITE_BOUNCES=1,SKYCOLOR_MODE=10,MATERIAL_TYPE=1,MXAO_MIPLEVEL_AO=1,MXAO_TWO_LAYER=1,MXAO_ENHANCED_FADE=1







[INPUT]



KeyMenu=36,0,0,0



KeyOverlay=36,0,0,0



KeyEffects={},0,0,0



KeyReload=19,0,0,0



InputProcessing=2







[OVERLAY]



TutorialProgress=4



"#, preset_name, preset_name, preset_name, preset_name, toggle_key_code);







    let _ = fs::write(sub_dir.join("ReShade.ini"), ini_content);
    ensure_goldstone_reshade_configured(Some(toggle_key_code));







    // Auto-reload ReShade live in RedM if game is running



    sync_reshade_key_to_game_memory_live(toggle_key_code);

    trigger_reshade_reload_live();

    emit_reshade_prog(app, 100, "DONE", "SUCCESS: GOLDSTONE PRESET ACTIVE! PRESS HOTKEY IN-GAME.", true, None);



    Ok(())



}







fn clean_uninstall_reshade(app: &tauri::AppHandle) -> Result<(), String> {



    emit_reshade_prog(app, 30, "1/3", "REMOVING RESHADE FILES...", false, None);







    let sub_dir = get_redm_subprocess_dir().ok_or("RedM directory not found on system.")?;







    emit_reshade_prog(app, 65, "2/3", "CLEANING GRAPHICS FILES...", false, None);







    let files_to_remove = [



        "dxgi.dll", "dxgi.dll.bak", "dxgi.log",



        "ReShade64.dll", "ReShade32.dll", "ReShade64.json", "ReShade32.json",



        "ReShade.ini", "ReShadePreset.ini", "DefaultPreset.ini",



        "Goldstone Enhanced (SZ).ini", "GoldStone Enhanced (SZ).ini",



        "Goldstone Enhanced.ini", "GoldStone Enhanced by SZ.ini"



    ];







    for f in &files_to_remove {



        let _ = fs::remove_file(sub_dir.join(f));



    }







    if let Ok(entries) = fs::read_dir(&sub_dir) {



        for entry in entries.flatten() {



            let path = entry.path();



            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {



                if name.starts_with("ReShade") && name.contains(".log") {



                    let _ = fs::remove_file(path);



                }



            }



        }



    }



    let _ = fs::remove_dir_all(sub_dir.join("reshade-shaders"));







    emit_reshade_prog(app, 90, "3/3", "RESTORING CLEAN GRAPHICS...", false, None);



    let hkcu = RegKey::predef(HKEY_CURRENT_USER);



    if let Ok(key) = hkcu.open_subkey_with_flags(r"Software\Khronos\Vulkan\ImplicitLayers", KEY_ALL_ACCESS) {



        let json_path_str = sub_dir.join("ReShade64.json").to_string_lossy().to_string();



        let _ = key.delete_value(&json_path_str);



    }







    emit_reshade_prog(app, 100, "DONE", "SUCCESS: RESHADE REMOVED! CLEAN REDM RESTORED.", true, None);



    Ok(())



}







#[tauri::command]



async fn check_reshade_status_backend() -> Result<ReShadeStatus, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut installed = false;
        let mut shaders_count = 0;
        let mut toggle_key_code = 118u32; // Default F7

        let mut candidate_sub_dirs = Vec::new();
        if let Some(sub) = get_redm_subprocess_dir() {
            candidate_sub_dirs.push(sub);
        }
        if let Some(redm_exe) = find_redm_exe(None) {
            if let Some(parent) = redm_exe.parent() {
                candidate_sub_dirs.push(parent.join(r"RedM.app\data\cache\subprocess"));
                candidate_sub_dirs.push(parent.join(r"data\cache\subprocess"));
                candidate_sub_dirs.push(parent.to_path_buf());
            }
        }

        for sub in &candidate_sub_dirs {
            if sub.join("ReShade.ini").exists() || sub.join("dxgi.dll").exists() || sub.join("ReShade64.dll").exists() {
                installed = true;
            }

            let sh_dir = sub.join(r"reshade-shaders\Shaders");
            if sh_dir.exists() {
                if let Ok(entries) = std::fs::read_dir(&sh_dir) {
                    let count = entries.filter_map(|e| e.ok())
                        .filter(|e| e.path().extension().map_or(false, |ext| ext == "fx"))
                        .count();
                    if count > shaders_count {
                        shaders_count = count;
                    }
                }
            }

            let ini_path = sub.join("ReShade.ini");
            if ini_path.exists() {
                if let Ok(content) = fs::read_to_string(ini_path) {
                    for line in content.lines() {
                        if line.trim().starts_with("KeyEffects=") {
                            if let Some(val) = line.split('=').nth(1) {
                                if let Some(code_str) = val.split(',').next() {
                                    if let Ok(code) = code_str.trim().parse::<u32>() {
                                        if code > 0 {
                                            toggle_key_code = code;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        let key_name = match toggle_key_code {
            112 => "F1", 113 => "F2", 114 => "F3", 115 => "F4",
            116 => "F5", 117 => "F6", 118 => "F7", 119 => "F8",
            120 => "F9", 121 => "F10", 122 => "F11", 123 => "F12",
            4 => "Mouse 3", 5 => "Mouse 4", 6 => "Mouse 5",
            35 => "End", 45 => "Insert", 46 => "Delete",
            _ => "Custom",
        }.to_string();

        Ok(ReShadeStatus {
            installed,
            preset_name: "Goldstone Enhanced (SZ)".to_string(),
            shaders_count,
            toggle_key: key_name,
            toggle_key_code,
        })
    }).await.map_err(|e| e.to_string())?
}







#[tauri::command]



async fn install_reshade_backend(app: tauri::AppHandle, graphics_api: Option<String>, toggle_key_code: Option<u32>) -> Result<(), String> {



    tauri::async_runtime::spawn_blocking(move || {



        let api = graphics_api.unwrap_or_else(|| "Auto".to_string());



        let key = toggle_key_code.unwrap_or(118);



        install_reshade_core_and_shaders(&app, &api, key)



    }).await.map_err(|e| e.to_string())?



}







#[tauri::command]



async fn uninstall_reshade_backend(app: tauri::AppHandle) -> Result<(), String> {



    tauri::async_runtime::spawn_blocking(move || {



        if is_redm_running() {



            return Err("Please close RedM before uninstalling ReShade.".to_string());



        }



        clean_uninstall_reshade(&app)



    }).await.map_err(|e| e.to_string())?



}







#[tauri::command]



async fn set_reshade_toggle_key_backend(key_code: u32) -> Result<(), String> {



    tauri::async_runtime::spawn_blocking(move || {



        if let Some(sub) = get_redm_subprocess_dir() {



            let ini_path = sub.join("ReShade.ini");



            if ini_path.exists() {



                if let Ok(content) = fs::read_to_string(&ini_path) {



                    let new_fx = format!("KeyEffects={},0,0,0", key_code);



                    let new_reload = "KeyReload=19,0,0,0".to_string();



                    let mut found_fx = false;



                    let mut found_reload = false;



                    let mut lines: Vec<String> = Vec::new();



                    for line in content.lines() {



                        if line.trim().starts_with("KeyEffects=") {



                            lines.push(new_fx.clone());



                            found_fx = true;



                        } else if line.trim().starts_with("KeyReload=") {



                            lines.push(new_reload.clone());



                            found_reload = true;



                        } else {



                            lines.push(line.to_string());



                        }



                    }



                    if !found_fx || !found_reload {



                        let mut inserted_fx = found_fx;



                        let mut inserted_reload = found_reload;



                        let mut final_lines: Vec<String> = Vec::new();



                        for l in lines {



                            final_lines.push(l.clone());



                            if l.trim() == "[INPUT]" {



                                if !inserted_fx {



                                    final_lines.push(new_fx.clone());



                                    inserted_fx = true;



                                }



                                if !inserted_reload {



                                    final_lines.push(new_reload.clone());



                                    inserted_reload = true;



                                }



                            }



                        }



                        if !inserted_fx || !inserted_reload {



                            final_lines.push("[INPUT]".to_string());



                            if !inserted_fx { final_lines.push(new_fx); }



                            if !inserted_reload { final_lines.push(new_reload); }



                        }



                        let _ = fs::write(&ini_path, final_lines.join("\r\n"));



                    } else {



                        let _ = fs::write(&ini_path, lines.join("\r\n"));



                    }



                }



            }



        }



        // Auto-reload ReShade live in RedM without requiring user to click reload
        ensure_goldstone_reshade_configured(Some(key_code));
    sync_reshade_key_to_game_memory_live(key_code);
        trigger_reshade_reload_live();

        Ok(())



    }).await.map_err(|e| e.to_string())?



}







pub fn run() {
    kill_headless_ts3_zombies();
    deploy_goldstone_ptt_plugin();
    start_launcher_ptt_bridge();
    


    tauri::Builder::default()



        .plugin(tauri_plugin_dialog::init()) 



        .plugin(tauri_plugin_shell::init())



        .invoke_handler(tauri::generate_handler![



            launch_teamspeak_backend, launch_redm_fresh, launch_redm_backend, launch_redm_plain, auto_detect_paths, 



            fetch_server_players, open_url_backend, kill_processes_backend, download_only_backend, 



            install_only_backend, check_update_backend, fix_vulkan_error_backend, clean_redm_cache_backend, 



            close_app_backend, minimize_app_backend, start_log_watcher, read_audio_dir_backend, read_audio_file_backend,



            resize_window_backend, is_game_running_backend,



            check_reshade_status_backend, install_reshade_backend, uninstall_reshade_backend, set_reshade_toggle_key_backend, silence_teamspeak_notifications_backend, check_ts3_status_backend, set_ts3_proximity_key_backend, get_ts3_audio_devices_backend, set_ts3_audio_device_backend, install_ts3_backend, uninstall_ts3_backend, get_music_folder_backend, sync_music_songs_backend, get_voice_config_backend



        ])



        .run(tauri::generate_context!())



        .expect("error while running tauri application");



}











pub const GOLDSTONE_PRESET_INI: &str = r#"PreprocessorDefinitions=FXAA_LINEAR_LIGHT=1,INFINITE_BOUNCES=1,SKYCOLOR_MODE=10,MATERIAL_TYPE=1,MXAO_MIPLEVEL_AO=1,MXAO_TWO_LAYER=1,MXAO_ENABLE_IL=1,MXAO_SMOOTHNORMALS=1



Techniques=Vignette@Vignette.fx,Lightroom@qUINT_lightroom.fx,ContrastAdaptiveSharpen@CAS.fx,Clarity@Clarity.fx







[CAS.fx]



Contrast=0.367000



Sharpening=1.000000







[Clarity.fx]



ClarityBlendIfDark=0



ClarityBlendIfLight=205



ClarityBlendMode=0



ClarityDarkIntensity=0.400000



ClarityLightIntensity=0.000000



ClarityOffset=3.000000



ClarityRadius=3



ClarityStrength=0.400000



ClarityViewBlendIfMask=0



ClarityViewMask=0







[qUINT_lightroom.fx]



LIGHTROOM_AQUA_EXPOSURE=0.000000



LIGHTROOM_AQUA_HUESHIFT=0.000000



LIGHTROOM_AQUA_SATURATION=0.000000



LIGHTROOM_BLUE_EXPOSURE=0.000000



LIGHTROOM_BLUE_HUESHIFT=-0.178000



LIGHTROOM_BLUE_SATURATION=0.177000



LIGHTROOM_ENABLE_CLIPPING_DISPLAY=0



LIGHTROOM_ENABLE_CURVE_DISPLAY=0



LIGHTROOM_ENABLE_LUT=0



LIGHTROOM_ENABLE_VIGNETTE=1



LIGHTROOM_GLOBAL_BLACKS_CURVE=0.000000



LIGHTROOM_GLOBAL_BLACK_LEVEL=0.000000



LIGHTROOM_GLOBAL_CONTRAST=0.000000



LIGHTROOM_GLOBAL_EXPOSURE=0.146000



LIGHTROOM_GLOBAL_GAMMA=0.048000



LIGHTROOM_GLOBAL_HIGHLIGHTS_CURVE=0.000000



LIGHTROOM_GLOBAL_MIDTONES_CURVE=0.000000



LIGHTROOM_GLOBAL_SATURATION=0.206000



LIGHTROOM_GLOBAL_SHADOWS_CURVE=-0.059000



LIGHTROOM_GLOBAL_TEMPERATURE=0.042000



LIGHTROOM_GLOBAL_TINT=0.000000



LIGHTROOM_GLOBAL_VIBRANCE=0.000000



LIGHTROOM_GLOBAL_WHITES_CURVE=0.000000



LIGHTROOM_GLOBAL_WHITE_LEVEL=255.000000



LIGHTROOM_GREEN_EXPOSURE=-0.151000



LIGHTROOM_GREEN_HUESHIFT=0.184000



LIGHTROOM_GREEN_SATURATION=0.109000



LIGHTROOM_LUT_SCROLL=0



LIGHTROOM_LUT_TILE_COUNT=16



LIGHTROOM_LUT_TILE_SIZE=16



LIGHTROOM_MAGENTA_EXPOSURE=0.000000



LIGHTROOM_MAGENTA_HUESHIFT=0.000000



LIGHTROOM_MAGENTA_SATURATION=0.000000



LIGHTROOM_ORANGE_EXPOSURE=0.000000



LIGHTROOM_ORANGE_HUESHIFT=0.000000



LIGHTROOM_ORANGE_SATURATION=0.000000



LIGHTROOM_RED_EXPOSURE=0.000000



LIGHTROOM_RED_HUESHIFT=0.000000



LIGHTROOM_RED_SATURATION=0.000000



LIGHTROOM_VIGNETTE_AMOUNT=0.148000



LIGHTROOM_VIGNETTE_BLEND_MODE=1



LIGHTROOM_VIGNETTE_COLOR=0.000000,0.000000,0.000000



LIGHTROOM_VIGNETTE_CURVE=1.577000



LIGHTROOM_VIGNETTE_HEIGHT=0.000000



LIGHTROOM_VIGNETTE_OFFS=0.000000,0.000000



LIGHTROOM_VIGNETTE_RADIUS_INNER=1.045000



LIGHTROOM_VIGNETTE_RADIUS_OUTER=2.586000



LIGHTROOM_VIGNETTE_SHOW_RADII=0



LIGHTROOM_VIGNETTE_WIDTH=0.000000



LIGHTROOM_YELLOW_EXPOSURE=0.000000



LIGHTROOM_YELLOW_HUESHIFT=0.000000



LIGHTROOM_YELLOW_SATURATION=0.234000







[Vignette.fx]



Amount=0.821000



Center=0.829000,0.500000



Radius=3.000000



Ratio=0.150000



Slope=9



Type=0







"#;



