//! Verify bundled helper bytes and keep them locked against replacement while used.
use std::fs::{self, File, OpenOptions};
use std::io::{self, Read};
use std::os::windows::fs::OpenOptionsExt;
use std::path::Path;

fn open_verified(path: &Path, expected: &[u8]) -> io::Result<File> {
    // Allow readers/executable mappings; deny writes and deletion until this handle closes.
    let mut file = OpenOptions::new().read(true).share_mode(1).open(path)?;
    if file.metadata()?.len() != expected.len() as u64 {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "Bundled helper size mismatch"));
    }
    let mut actual = Vec::with_capacity(expected.len());
    (&mut file).take(expected.len() as u64 + 1).read_to_end(&mut actual)?;
    if actual != expected {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "Bundled helper integrity mismatch"));
    }
    Ok(file)
}

pub fn ensure_verified(path: &Path, expected: &[u8]) -> io::Result<File> {
    match open_verified(path, expected) {
        Ok(file) => return Ok(file),
        Err(error) if matches!(error.kind(), io::ErrorKind::NotFound | io::ErrorKind::InvalidData) => {}
        Err(error) => return Err(error),
    }
    fs::write(path, expected)?;
    // Verify again after writing and hold a read-only sharing lock before execution/loading.
    open_verified(path, expected)
}
