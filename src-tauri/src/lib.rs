use tauri::{Manager, ResourceId, Runtime, Webview};
use serde::Serialize;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct ForceUpdateMetadata {
    rid: ResourceId,
    current_version: String,
    version: String,
    date: Option<String>,
    body: Option<String>,
    raw_json: serde_json::Value,
}

#[tauri::command]
async fn force_update_check<R: Runtime>(webview: Webview<R>) -> Result<Option<ForceUpdateMetadata>, String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = webview
        .updater_builder()
        .version_comparator(|_, _| true)
        .build()
        .map_err(|e| e.to_string())?;

    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        let formatted_date = if let Some(date) = update.date {
            date.format(&time::format_description::well_known::Rfc3339)
                .ok()
        } else {
            None
        };
        let metadata = ForceUpdateMetadata {
            current_version: update.current_version.clone(),
            version: update.version.clone(),
            date: formatted_date,
            body: update.body.clone(),
            raw_json: update.raw_json.clone(),
            rid: webview.resources_table().add(update),
        };
        Ok(Some(metadata))
    } else {
        Ok(None)
    }
}

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
        .invoke_handler(tauri::generate_handler![force_update_check])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
