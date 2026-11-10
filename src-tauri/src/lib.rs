#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let is_dev_channel = serde_json::from_str::<serde_json::Value>(include_str!("../../package.json"))
        .ok()
        .and_then(|v| v.get("versionChannel").and_then(|c| c.as_str()).map(|c| c == "dev"))
        .unwrap_or(false);

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    #[cfg(target_os = "macos")]
    {
        builder = builder.setup(move |app| {
            if !is_dev_channel {
                let _ = app.remove_menu();
            }
            Ok(())
        });
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
