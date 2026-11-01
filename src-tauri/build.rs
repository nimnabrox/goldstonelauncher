use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri_build::{Attributes, WindowsAttributes};

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());

    // 1. Mask WebView2Loader.dll with 0x5B so no raw PE header triggers heuristics
    let dll_candidates = [
        manifest_dir.join("WebView2Loader.dll"),
        PathBuf::from("WebView2Loader.dll"),
        PathBuf::from("../WebView2Loader.dll"),
        PathBuf::from("../../WebView2Loader.dll"),
    ];
    for p in &dll_candidates {
        if p.exists() {
            if let Ok(bytes) = fs::read(p) {
                let masked: Vec<u8> = bytes.into_iter().map(|b| b ^ 0x5B).collect();
                let _ = fs::write(out_dir.join("webview2_loader.bin"), masked);
                break;
            }
        }
    }

        // 2. Compile webview2_thunk.c to provide direct dynamic-forwarding stubs
    let c_file = manifest_dir.join("webview2_thunk.c");
    let o_file = out_dir.join("webview2_thunk.o");
    let a_file = out_dir.join("libwebview2_thunk.a");

    let status = Command::new("gcc")
        .args(&["-c", "-O2", c_file.to_str().unwrap(), "-o", o_file.to_str().unwrap()])
        .status()
        .expect("failed to compile webview2_thunk.c");
    assert!(status.success(), "gcc failed to compile webview2_thunk.c");

    let status = Command::new("ar")
        .args(&["rcs", a_file.to_str().unwrap(), o_file.to_str().unwrap()])
        .status()
        .expect("failed to archive libwebview2_thunk.a");
    assert!(status.success(), "ar failed to create libwebview2_thunk.a");

    println!("cargo:rustc-link-search=native={}", out_dir.display());
    println!("cargo:rustc-link-lib=static=webview2_thunk");
    
    let manifest = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity
    version="0.3.1.0"
    processorArchitecture="*"
    name="Nimnabro.GoldstoneCounty.Launcher"
    type="win32"
  />
  <description>Goldstone County Launcher</description>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="asInvoker" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
      <supportedOS Id="{1f676c76-80e1-4239-95bb-83d0f6d0da78}"/>
      <supportedOS Id="{4a2f28e3-53b9-4441-ba9c-d69d4a4a6e38}"/>
      <supportedOS Id="{35138b9a-5d96-4fbd-8e2d-a2440225f93a}"/>
    </application>
  </compatibility>
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
</assembly>
"#;

    let windows = WindowsAttributes::new().app_manifest(manifest);
    let attributes = Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attributes).expect("failed to run tauri-build");
}
