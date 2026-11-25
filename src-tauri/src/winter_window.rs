//! Normal rectangular window configuration for the winter edition.
//! Fits within smaller monitor work areas at 16:9 while keeping startup hidden
//! until the frontend has decoded its bundled artwork.
use tauri::Manager;

pub const WIDTH: f64 = 1024.0;
pub const HEIGHT: f64 = 576.0;

pub fn compute_window_fit(available_width: f64, available_height: f64, dpi: f64) -> (f64, f64) {
    let safe_dpi = if dpi.is_finite() && dpi > 0.0 { dpi } else { 1.0 };
    let fit = ((available_width / safe_dpi - 24.0) / WIDTH)
        .min((available_height / safe_dpi - 24.0) / HEIGHT)
        .min(1.0)
        .max(0.1);
    (WIDTH * fit, HEIGHT * fit)
}

/// Invoked after React has fitted the shell and decoded its local poster/logo.
#[tauri::command]
pub fn show_winter_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())
}

pub fn configure(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").ok_or("Main window missing")?;
    window.set_shadow(false)?;
    if let Some(monitor) = window.current_monitor()? {
        let available = monitor.work_area().size;
        let (width, height) = compute_window_fit(
            available.width as f64,
            available.height as f64,
            monitor.scale_factor(),
        );
        window.set_size(tauri::LogicalSize::new(width, height))?;
        window.center()?;
    }
    Ok(())
}
