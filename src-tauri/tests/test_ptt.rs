use std::path::PathBuf;
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug)]
struct AudioDeviceItem {
    name: String,
    id: String,
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

#[test]
fn test_enum() {
    let inputs = enumerate_audio_devices_registry(true);
    let outputs = enumerate_audio_devices_registry(false);
    println!("Inputs: {:?}", inputs);
    println!("Outputs: {:?}", outputs);

    let appdata = std::env::var("APPDATA").unwrap();
    let db_path = PathBuf::from(appdata).join(r"TS3Client\settings.db");

    #[link(name = "kernel32")]
    extern "system" {
        fn LoadLibraryW(lpLibFileName: *const u16) -> *mut std::ffi::c_void;
        fn GetProcAddress(hModule: *mut std::ffi::c_void, lpProcName: *const u8) -> *mut std::ffi::c_void;
        fn FreeLibrary(hLibModule: *mut std::ffi::c_void) -> i32;
    }

    fn to_wide(s: &str) -> Vec<u16> {
        use std::os::windows::ffi::OsStrExt;
        std::ffi::OsStr::new(s).encode_wide().chain(Some(0)).collect()
    }

    unsafe {
        let dll = LoadLibraryW(to_wide("winsqlite3.dll").as_ptr());
        type Open = unsafe extern "system" fn(*const u16, *mut *mut std::ffi::c_void) -> i32;
        type Prep = unsafe extern "system" fn(*mut std::ffi::c_void, *const u16, i32, *mut *mut std::ffi::c_void, *mut *const u16) -> i32;
        type Step = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
        type ColText = unsafe extern "system" fn(*mut std::ffi::c_void, i32) -> *const std::ffi::c_char;
        type Finalize = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;
        type Close = unsafe extern "system" fn(*mut std::ffi::c_void) -> i32;

        let open: Open = std::mem::transmute(GetProcAddress(dll, b"sqlite3_open16\0".as_ptr()));
        let prep: Prep = std::mem::transmute(GetProcAddress(dll, b"sqlite3_prepare16_v2\0".as_ptr()));
        let step: Step = std::mem::transmute(GetProcAddress(dll, b"sqlite3_step\0".as_ptr()));
        let col_text: ColText = std::mem::transmute(GetProcAddress(dll, b"sqlite3_column_text\0".as_ptr()));
        let finalize: Finalize = std::mem::transmute(GetProcAddress(dll, b"sqlite3_finalize\0".as_ptr()));
        let close: Close = std::mem::transmute(GetProcAddress(dll, b"sqlite3_close\0".as_ptr()));

        let mut db = std::ptr::null_mut();
        let path_w = to_wide(&db_path.to_string_lossy());
        if open(path_w.as_ptr(), &mut db) == 0 {
            let sql_w = to_wide("SELECT key, value FROM Profiles WHERE key='Capture/Default' OR key='Playback/Default'");
            let mut stmt = std::ptr::null_mut();
            if prep(db, sql_w.as_ptr(), -1, &mut stmt, std::ptr::null_mut()) == 0 {
                while step(stmt) == 100 {
                    let k = std::ffi::CStr::from_ptr(col_text(stmt, 0)).to_string_lossy();
                    let v = std::ffi::CStr::from_ptr(col_text(stmt, 1)).to_string_lossy();
                    println!("SQLITE RESULT: {} ->\n{}", k, v);
                }
                finalize(stmt);
            }
            close(db);
        }
        FreeLibrary(dll);
    }
}
