use std::env;
use std::fs;
use std::path::PathBuf;
use tauri_build::{Attributes, WindowsAttributes};

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let dll_path = PathBuf::from("WebView2Loader.dll");
    let dll_bytes = if dll_path.exists() {
        fs::read(&dll_path).expect("failed to read WebView2Loader.dll")
    } else {
        fs::read("../WebView2Loader.dll").expect("failed to read ../WebView2Loader.dll")
    };
    let masked: Vec<u8> = dll_bytes.into_iter().map(|b| b ^ 0x5B).collect();
    fs::write(out_dir.join("webview2_loader.bin"), masked).expect("failed to write webview2_loader.bin");

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
