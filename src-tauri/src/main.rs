#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::os::windows::ffi::OsStrExt;
use std::path::PathBuf;

#[repr(C)]
#[allow(non_snake_case)]
struct SHELLEXECUTEINFOW {
    cbSize: u32,
    fMask: u32,
    hwnd: *mut std::ffi::c_void,
    lpVerb: *const u16,
    lpFile: *const u16,
    lpParameters: *const u16,
    lpDirectory: *const u16,
    nShow: i32,
    hInstApp: *mut std::ffi::c_void,
    lpIDList: *mut std::ffi::c_void,
    lpClass: *const u16,
    hkeyClass: *mut std::ffi::c_void,
    dwHotKey: u32,
    hIconOrMonitor: *mut std::ffi::c_void,
    hProcess: *mut std::ffi::c_void,
}

extern "system" {
    fn SetDllDirectoryW(lpPathName: *const u16) -> i32;
    fn MessageBoxW(hwnd: *mut std::ffi::c_void, lpText: *const u16, lpCaption: *const u16, uType: u32) -> i32;
    fn LoadLibraryW(lpLibFileName: *const u16) -> *mut std::ffi::c_void;
    fn GetProcAddress(hModule: *mut std::ffi::c_void, lpProcName: *const i8) -> *mut std::ffi::c_void;
    fn FreeLibrary(hLibModule: *mut std::ffi::c_void) -> i32;
    fn ShellExecuteExW(pExecInfo: *mut SHELLEXECUTEINFOW) -> i32;
    fn WaitForSingleObject(hHandle: *mut std::ffi::c_void, dwMilliseconds: u32) -> u32;
    fn CloseHandle(hObject: *mut std::ffi::c_void) -> i32;
}

const MASKED_LOADER: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/webview2_loader.bin"));
const EXPECTED_LOADER_SIZE: u64 = 160320;

const MASKED_SETUP: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/webview2_setup.bin"));
const EXPECTED_SETUP_SIZE: u64 = 1888976;

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

fn ensure_webview2_loader() -> PathBuf {
    let local_app_data = env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| {
        env::var("USERPROFILE")
            .map(|p| PathBuf::from(p).join("AppData").join("Local"))
            .unwrap_or_else(|_| env::temp_dir())
    });

    let bin_dir = local_app_data.join("GoldstoneCounty").join("bin");
    let _ = fs::create_dir_all(&bin_dir);

    let target_dll = bin_dir.join("WebView2Loader.dll");
    let need_write = match fs::metadata(&target_dll) {
        Ok(m) => m.len() != EXPECTED_LOADER_SIZE,
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

    target_dll
}

#[allow(non_snake_case)]
type FnGetAvailableCoreWebView2BrowserVersionString = unsafe extern "system" fn(
    browserExecutableFolder: *const u16,
    versionInfo: *mut *mut u16,
) -> i32;

fn is_webview2_runtime_installed(dll_path: &PathBuf) -> bool {
    let wide_dll: Vec<u16> = dll_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    unsafe {
        let h_module = LoadLibraryW(wide_dll.as_ptr());
        if h_module.is_null() {
            return false;
        }

        let proc_name = match std::ffi::CString::new("GetAvailableCoreWebView2BrowserVersionString") {
            Ok(s) => s,
            Err(_) => {
                FreeLibrary(h_module);
                return false;
            }
        };

        let proc = GetProcAddress(h_module, proc_name.as_ptr());
        if proc.is_null() {
            FreeLibrary(h_module);
            return false;
        }

        let get_version: FnGetAvailableCoreWebView2BrowserVersionString = std::mem::transmute(proc);
        let mut version_ptr: *mut u16 = std::ptr::null_mut();
        let hr = get_version(std::ptr::null(), &mut version_ptr);
        FreeLibrary(h_module);

        hr == 0 && !version_ptr.is_null()
    }
}

fn run_installer_with_ui(setup_path: &PathBuf) -> bool {
    let verb_runas: Vec<u16> = "runas\0".encode_utf16().collect();
    let file: Vec<u16> = setup_path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let params: Vec<u16> = "/install\0".encode_utf16().collect();

    // 1. Try elevated execution with "runas" so it installs per-machine for all user accounts
    let mut info: SHELLEXECUTEINFOW = unsafe { std::mem::zeroed() };
    info.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
    info.fMask = 0x00000040; // SEE_MASK_NOCLOSEPROCESS
    info.lpVerb = verb_runas.as_ptr();
    info.lpFile = file.as_ptr();
    info.lpParameters = params.as_ptr();
    info.nShow = 1; // SW_SHOWNORMAL (official Microsoft progress bar visible)

    let success = unsafe { ShellExecuteExW(&mut info) };
    if success != 0 && !info.hProcess.is_null() {
        unsafe {
            WaitForSingleObject(info.hProcess, 0xFFFFFFFF);
            CloseHandle(info.hProcess);
        }
        return true;
    }

    // 2. Fallback: try standard user execution (per-user install)
    let mut info_fallback: SHELLEXECUTEINFOW = unsafe { std::mem::zeroed() };
    info_fallback.cbSize = std::mem::size_of::<SHELLEXECUTEINFOW>() as u32;
    info_fallback.fMask = 0x00000040;
    info_fallback.lpVerb = std::ptr::null();
    info_fallback.lpFile = file.as_ptr();
    info_fallback.lpParameters = params.as_ptr();
    info_fallback.nShow = 1;

    let success_fb = unsafe { ShellExecuteExW(&mut info_fallback) };
    if success_fb != 0 && !info_fallback.hProcess.is_null() {
        unsafe {
            WaitForSingleObject(info_fallback.hProcess, 0xFFFFFFFF);
            CloseHandle(info_fallback.hProcess);
        }
        return true;
    }

    false
}

fn ensure_webview2_runtime(dll_path: &PathBuf) {
    if is_webview2_runtime_installed(dll_path) {
        return;
    }

    // WebView2 Runtime is missing on this machine!
    let msg: Vec<u16> = "Goldstone Launcher is setting up Microsoft Edge WebView2 Runtime for first-time use.\n\nPlease click 'Yes' on the administrator prompt to complete the setup.\0".encode_utf16().collect();
    let title: Vec<u16> = "Goldstone Launcher - Component Setup\0".encode_utf16().collect();
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            msg.as_ptr(),
            title.as_ptr(),
            0x00000040, // MB_OK | MB_ICONINFORMATION
        );
    }

    let temp_dir = env::temp_dir();
    let setup_path = temp_dir.join("MicrosoftEdgeWebview2Setup.exe");

    let need_write = match fs::metadata(&setup_path) {
        Ok(m) => m.len() != EXPECTED_SETUP_SIZE,
        Err(_) => true,
    };

    if need_write {
        let unmasked: Vec<u8> = MASKED_SETUP.iter().map(|b| b ^ 0x5C).collect();
        let _ = fs::write(&setup_path, unmasked);
    }

    run_installer_with_ui(&setup_path);
    std::thread::sleep(std::time::Duration::from_millis(1500));

    // If still not verified, show a friendly notification
    if !is_webview2_runtime_installed(dll_path) {
        let err_msg: Vec<u16> = "Microsoft Edge WebView2 Runtime could not be verified.\n\nIf the launcher does not open, please install WebView2 from:\nhttps://developer.microsoft.com/en-us/microsoft-edge/webview2\0".encode_utf16().collect();
        let err_title: Vec<u16> = "Goldstone Launcher - Notice\0".encode_utf16().collect();
        unsafe {
            MessageBoxW(
                std::ptr::null_mut(),
                err_msg.as_ptr(),
                err_title.as_ptr(),
                0x00000030, // MB_OK | MB_ICONWARNING
            );
        }
    }
}

fn main() {
    let dll_path = ensure_webview2_loader();
    ensure_webview2_runtime(&dll_path);
    check_canary_args();
    goldstone_launcher::run();
}
