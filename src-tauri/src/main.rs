#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
mod runtime_integrity;
use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use winreg::enums::*;
use winreg::RegKey;

extern "system" {
    fn goldstone_load_verified_webview2(path: *const u16) -> i32;
    fn MessageBoxW(hwnd: *mut std::ffi::c_void, lpText: *const u16, lpCaption: *const u16, uType: u32) -> i32;
    fn LoadLibraryW(lpLibFileName: *const u16) -> *mut std::ffi::c_void;
    fn GetProcAddress(hModule: *mut std::ffi::c_void, lpProcName: *const i8) -> *mut std::ffi::c_void;
    fn FreeLibrary(hLibModule: *mut std::ffi::c_void) -> i32;
}

const BUNDLED_LOADER: &[u8] = include_bytes!("../WebView2Loader.dll");
const BUNDLED_SETUP: &[u8] = include_bytes!("../MicrosoftEdgeWebview2Setup.exe");

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

fn ensure_webview2_loader() -> std::io::Result<(PathBuf, fs::File)> {
    let local_app_data = env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| {
        env::var("USERPROFILE")
            .map(|p| PathBuf::from(p).join("AppData").join("Local"))
            .unwrap_or_else(|_| env::temp_dir())
    });

    let bin_dir = local_app_data.join("GoldstoneCounty").join("bin");
    fs::create_dir_all(&bin_dir)?;

    let target_dll = bin_dir.join("WebView2Loader.dll");
    let guard = runtime_integrity::ensure_verified(&target_dll, BUNDLED_LOADER)?;

    // Pin the verified absolute DLL in the thunk; no working-directory/search-path fallback.
    let wide_path: Vec<u16> = target_dll.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    if unsafe { goldstone_load_verified_webview2(wide_path.as_ptr()) } == 0 {
        return Err(std::io::Error::last_os_error());
    }

    Ok((target_dll, guard))
}

#[allow(non_snake_case)]
type FnGetAvailableCoreWebView2BrowserVersionString = unsafe extern "system" fn(
    browserExecutableFolder: *const u16,
    versionInfo: *mut *mut u16,
) -> i32;

fn is_version_available(dll_path: &Path, folder: Option<&Path>) -> Option<String> {
    let wide_dll: Vec<u16> = dll_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    unsafe {
        let h_module = LoadLibraryW(wide_dll.as_ptr());
        if h_module.is_null() {
            return None;
        }

        let proc_name = match std::ffi::CString::new("GetAvailableCoreWebView2BrowserVersionString") {
            Ok(s) => s,
            Err(_) => {
                FreeLibrary(h_module);
                return None;
            }
        };

        let proc = GetProcAddress(h_module, proc_name.as_ptr());
        if proc.is_null() {
            FreeLibrary(h_module);
            return None;
        }

        let get_version: FnGetAvailableCoreWebView2BrowserVersionString = std::mem::transmute(proc);
        let mut version_ptr: *mut u16 = std::ptr::null_mut();

        let wide_folder: Option<Vec<u16>> = folder.map(|f| {
            f.as_os_str().encode_wide().chain(std::iter::once(0)).collect()
        });
        let folder_ptr = wide_folder.as_ref().map(|v| v.as_ptr()).unwrap_or(std::ptr::null());

        let hr = get_version(folder_ptr, &mut version_ptr);
        FreeLibrary(h_module);

        if hr == 0 && !version_ptr.is_null() {
            let mut len = 0;
            while *version_ptr.add(len) != 0 {
                len += 1;
            }
            let slice = std::slice::from_raw_parts(version_ptr, len);
            let ver_str = String::from_utf16_lossy(slice);
            Some(ver_str)
        } else {
            None
        }
    }
}

fn find_local_webview2_runtime(dll_path: &Path) -> Option<(PathBuf, String)> {
    let local_app_data = env::var("LOCALAPPDATA").map(PathBuf::from).ok();
    let program_files_x86 = env::var("ProgramFiles(x86)").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from(r"C:\Program Files (x86)"));
    let program_files = env::var("ProgramFiles").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from(r"C:\Program Files"));

    let mut candidate_roots = Vec::new();

    // 1. Official WebView2 Runtime folders
    candidate_roots.push(program_files_x86.join(r"Microsoft\EdgeWebView\Application"));
    candidate_roots.push(program_files.join(r"Microsoft\EdgeWebView\Application"));
    if let Some(ref lad) = local_app_data {
        candidate_roots.push(lad.join(r"Microsoft\EdgeWebView\Application"));
    }

    // 2. Microsoft EdgeCore folders (preinstalled on Windows 10/11)
    candidate_roots.push(program_files_x86.join(r"Microsoft\EdgeCore"));
    candidate_roots.push(program_files.join(r"Microsoft\EdgeCore"));

    // 3. Microsoft Edge Application folders (preinstalled on Windows 10/11)
    candidate_roots.push(program_files_x86.join(r"Microsoft\Edge\Application"));
    candidate_roots.push(program_files.join(r"Microsoft\Edge\Application"));

    for root in candidate_roots {
        if !root.is_dir() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&root) {
            let mut subdirs: Vec<PathBuf> = entries
                .filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| p.is_dir())
                .collect();

            // Reverse sort so highest version numbers are inspected first
            subdirs.sort_by(|a, b| b.cmp(a));

            for subdir in subdirs {
                let has_dll = subdir.join(r"EBWebView\x64\EmbeddedBrowserWebView.dll").is_file()
                    || subdir.join(r"EBWebView\x86\EmbeddedBrowserWebView.dll").is_file();
                let has_exe = subdir.join("msedgewebview2.exe").is_file();

                if has_dll || has_exe {
                    if let Some(ver) = is_version_available(dll_path, Some(&subdir)) {
                        return Some((subdir, ver));
                    }
                }
            }
        }
    }

    None
}

fn register_runtime_in_hkcu(folder: &Path, ver: &str) {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok((key, _)) = hkcu.create_subkey(r"Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}") {
        let _ = key.set_value("pv", &ver);
        let _ = key.set_value("location", &folder.to_string_lossy().to_string());
    }
}

fn ensure_webview2_runtime(dll_path: &Path) -> std::io::Result<()> {
    // 1. If runtime is already detected and working for this user, proceed immediately
    if is_version_available(dll_path, None).is_some() {
        return Ok(());
    }

    // 2. Discover local runtime on Windows 10/11 disk (EdgeWebView, EdgeCore, Edge)
    if let Some((dir, ver)) = find_local_webview2_runtime(dll_path) {
        env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", &dir);
        register_runtime_in_hkcu(&dir, &ver);

        if is_version_available(dll_path, None).is_some() {
            return Ok(());
        }
    }

    // 3. Fallback: silent auto-provisioning via embedded bootstrapper if drive has zero runtime files
    let temp_dir = env::temp_dir();
    let setup_path = temp_dir.join("MicrosoftEdgeWebview2Setup.exe");

    let _setup_guard = runtime_integrity::ensure_verified(&setup_path, BUNDLED_SETUP)?;

    let mut cmd = std::process::Command::new(&setup_path);
    cmd.args(&["/silent", "/install"]);
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    if let Ok(mut child) = cmd.spawn() {
        for _ in 0..25 {
            std::thread::sleep(std::time::Duration::from_millis(1000));
            if is_version_available(dll_path, None).is_some() {
                let _ = child.kill();
                return Ok(());
            }
            if let Ok(Some(_)) = child.try_wait() {
                break;
            }
        }
    }

    // Final check for newly installed runtime
    if let Some((dir, ver)) = find_local_webview2_runtime(dll_path) {
        env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", &dir);
        register_runtime_in_hkcu(&dir, &ver);
    }
    Ok(())
}

fn main() {
    // Hold this guard until shutdown so another process cannot replace the verified DLL.
    let (dll_path, _loader_guard) = ensure_webview2_loader().unwrap_or_else(startup_error);
    ensure_webview2_runtime(&dll_path).unwrap_or_else(startup_error);
    check_canary_args();
    goldstone_launcher::run();
}

fn startup_error<T>(error: std::io::Error) -> T {
    let title: Vec<u16> = "Goldstone County Launcher\0".encode_utf16().collect();
    let message: Vec<u16> = format!("Could not prepare the verified Microsoft WebView2 helper.\n{error}\0").encode_utf16().collect();
    unsafe { MessageBoxW(std::ptr::null_mut(), message.as_ptr(), title.as_ptr(), 0x10); }
    std::process::exit(1);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verified_microsoft_loader_is_callable_through_the_native_thunk() {
        extern "system" {
            fn CompareBrowserVersions(first: *const u16, second: *const u16, result: *mut i32) -> i32;
        }
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("WebView2Loader.dll");
        let _guard = runtime_integrity::ensure_verified(&path, BUNDLED_LOADER).unwrap();
        let wide: Vec<u16> = path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
        assert_ne!(unsafe { goldstone_load_verified_webview2(wide.as_ptr()) }, 0);
        let first: Vec<u16> = "1.0.0.0\0".encode_utf16().collect();
        let second: Vec<u16> = "2.0.0.0\0".encode_utf16().collect();
        let mut comparison = 0;
        assert_eq!(unsafe { CompareBrowserVersions(first.as_ptr(), second.as_ptr(), &mut comparison) }, 0);
        assert!(comparison < 0);
    }
}
