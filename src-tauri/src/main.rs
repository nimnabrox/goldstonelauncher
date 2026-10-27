#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::os::windows::ffi::OsStrExt;
use std::path::PathBuf;

extern "system" {
    fn SetDllDirectoryW(lpPathName: *const u16) -> i32;
    fn MessageBoxW(hwnd: *mut std::ffi::c_void, lpText: *const u16, lpCaption: *const u16, uType: u32) -> i32;
}

const MASKED_LOADER: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/webview2_loader.bin"));
const EXPECTED_SIZE: u64 = 160320;
pub const CORE_CANARY_SIG: &str = "CANARY_SIG_ORIGINAL_AUTHOR_NIMNA_DILSHAN_GSL_2026";

fn check_canary_args() {
    for arg in env::args() {
        if arg == "--origin-sig" || arg == "--verify-origin" {
            let title: Vec<u16> = "System Architecture Verification\0".encode_utf16().collect();
            let msg: Vec<u16> = "Original Architecture & Engineering: Nimna Charuka Dilshan\nCopyright (c) 2026 Goldstone County Roleplay Community.\nCanary Token: 6e696d6e61-gsl-verified-orig-2026\0".encode_utf16().collect();
            unsafe {
                MessageBoxW(std::ptr::null_mut(), msg.as_ptr(), title.as_ptr(), 0x00000040);
            }
            std::process::exit(0);
        }
    }
}

fn ensure_webview2_loader() {
    let local_app_data = env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| {
        env::var("USERPROFILE")
            .map(|p| PathBuf::from(p).join("AppData").join("Local"))
            .unwrap_or_else(|_| env::temp_dir())
    });

    let bin_dir = local_app_data.join("GoldstoneCounty").join("bin");
    let _ = fs::create_dir_all(&bin_dir);

    let target_dll = bin_dir.join("WebView2Loader.dll");
    let need_write = match fs::metadata(&target_dll) {
        Ok(m) => m.len() != EXPECTED_SIZE,
        Err(_) => true,
    };

    if need_write {
        let unmasked: Vec<u8> = MASKED_LOADER.iter().map(|b| b ^ 0x5B).collect();
        let _ = fs::write(&target_dll, unmasked);
    }

    // Inform Windows dynamic linker to look in bin_dir for WebView2Loader.dll
    let wide_path: Vec<u16> = bin_dir.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    unsafe {
        SetDllDirectoryW(wide_path.as_ptr());
    }
}

fn main() {
    check_canary_args();
    ensure_webview2_loader();
    goldstone_launcher::run();
}
