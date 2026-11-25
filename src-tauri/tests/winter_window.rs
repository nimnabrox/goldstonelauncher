#[path = "../src/winter_window.rs"]
mod winter_window;

use winter_window::{compute_window_fit, HEIGHT, WIDTH};

#[test]
fn standard_monitors_keep_native_1024_by_576_dimensions() {
    assert_eq!(compute_window_fit(1920.0, 1080.0, 1.0), (WIDTH, HEIGHT));
    assert_eq!(compute_window_fit(2560.0, 1440.0, 1.25), (WIDTH, HEIGHT));
    assert_eq!(compute_window_fit(1280.0, 720.0, 1.0), (WIDTH, HEIGHT));
}

#[test]
fn compact_or_high_dpi_work_areas_scale_down_preserving_16_9_aspect() {
    let (w, h) = compute_window_fit(1366.0, 768.0, 1.5);
    assert!(w < WIDTH && h < HEIGHT);
    assert!((w / h - WIDTH / HEIGHT).abs() < 1e-6);
    assert!(w <= 1366.0 / 1.5 - 24.0 + 1e-6);
    assert!(h <= 768.0 / 1.5 - 24.0 + 1e-6);
}

#[test]
fn invalid_dpi_falls_back_safely() {
    assert_eq!(compute_window_fit(1920.0, 1080.0, 0.0), (WIDTH, HEIGHT));
    assert_eq!(compute_window_fit(1920.0, 1080.0, f64::NAN), (WIDTH, HEIGHT));
}
