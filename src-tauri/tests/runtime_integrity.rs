#[path = "../src/runtime_integrity.rs"]
mod runtime_integrity;

use runtime_integrity::ensure_verified;
use std::{fs, path::PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};

struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        let path = std::env::temp_dir().join(format!("goldstone-integrity-{}-{}", std::process::id(), NEXT.fetch_add(1, Ordering::Relaxed)));
        fs::create_dir(&path).unwrap();
        Self(path)
    }
    fn file(&self) -> PathBuf { self.0.join("helper.exe") }
}
impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); } }

#[test]
fn missing_helper_is_installed_exactly() {
    let fixture = Fixture::new();
    let _guard = ensure_verified(&fixture.file(), b"trusted helper").unwrap();
    assert_eq!(fs::read(fixture.file()).unwrap(), b"trusted helper");
}

#[test]
fn same_size_tampering_is_repaired_before_use() {
    let fixture = Fixture::new();
    fs::write(fixture.file(), b"hostile helper").unwrap();
    let _guard = ensure_verified(&fixture.file(), b"trusted helper").unwrap();
    assert_eq!(fs::read(fixture.file()).unwrap(), b"trusted helper");
}

#[test]
fn truncated_helper_is_repaired() {
    let fixture = Fixture::new();
    fs::write(fixture.file(), b"bad").unwrap();
    let _guard = ensure_verified(&fixture.file(), b"trusted helper").unwrap();
    assert_eq!(fs::read(fixture.file()).unwrap(), b"trusted helper");
}

#[test]
fn guard_prevents_write_and_delete_until_released() {
    let fixture = Fixture::new();
    let guard = ensure_verified(&fixture.file(), b"trusted helper").unwrap();
    assert!(fs::write(fixture.file(), b"hostile helper").is_err());
    assert!(fs::remove_file(fixture.file()).is_err());
    drop(guard);
    fs::write(fixture.file(), b"hostile helper").unwrap();
}

#[test]
fn concurrent_readers_can_use_the_same_verified_helper() {
    let fixture = Fixture::new();
    let _first = ensure_verified(&fixture.file(), b"trusted helper").unwrap();
    let _second = ensure_verified(&fixture.file(), b"trusted helper").unwrap();
}

#[test]
fn inaccessible_target_fails_without_being_used() {
    let fixture = Fixture::new();
    fs::create_dir(fixture.file()).unwrap();
    assert!(ensure_verified(&fixture.file(), b"trusted helper").is_err());
}
