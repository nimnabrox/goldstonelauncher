use std::path::{Path, PathBuf};

#[test]
fn test_check_ts3() {
    let mut candidate_dirs: Vec<PathBuf> = Vec::new();
    if let Ok(appdata) = std::env::var("APPDATA") {
        candidate_dirs.push(PathBuf::from(&appdata).join(r"TS3Client\plugins"));
    }
    candidate_dirs.push(PathBuf::from(r"C:\Program Files\TeamSpeak 3 Client\plugins"));
    candidate_dirs.push(PathBuf::from(r"C:\Program Files (x86)\TeamSpeak 3 Client\plugins"));

    let mut salty_installed = false;
    for dir in &candidate_dirs {
        let dll64 = dir.join("SaltyChat_win64.dll");
        let dll32 = dir.join("SaltyChat_win32.dll");
        println!("Checking dir {:?}: exists={}, dll64={}, dll32={}", dir, dir.exists(), dll64.exists(), dll32.exists());
        if dll64.exists() || dll32.exists() {
            salty_installed = true;
            break;
        }
    }
    println!("Salty installed: {}", salty_installed);
}
