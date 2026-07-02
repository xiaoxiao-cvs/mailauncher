/// 日志与消息队列命令
///
/// 提供前端日志管理（保存、列表、查看、导出、清理）
/// 以及 MaiBot 实例消息队列查询的 Tauri 命令。
use tauri::{AppHandle, Manager, State};

use crate::errors::{AppError, AppResult};
use crate::models::log::*;
use crate::models::message_queue::*;
use crate::services::{instance_service, log_service, maibot_log, message_queue_service};
use crate::state::AppState;

// ==================== 前端日志命令 ====================

/// 保存前端日志到文件
#[tauri::command]
pub fn save_frontend_logs(entries: Vec<LogEntry>) -> AppResult<()> {
    log_service::save_frontend_logs(entries)
}

// ==================== 日志目录 ====================

/// 在系统文件管理器中打开后端日志目录。
///
/// tauri-plugin-log 默认写入 `app_log_dir`,此前没有任何可见入口能定位到它,
/// 用户排查后端问题时无从下手。目录可能尚未生成,先确保存在再打开。
#[tauri::command]
pub fn open_log_directory(app_handle: AppHandle) -> AppResult<()> {
    let log_dir = app_handle
        .path()
        .app_log_dir()
        .map_err(|e| AppError::Internal(format!("无法解析日志目录: {}", e)))?;
    std::fs::create_dir_all(&log_dir)?;
    open_path_in_file_manager(&log_dir)
}

/// 用系统默认文件管理器打开一个目录(跨平台)。
fn open_path_in_file_manager(path: &std::path::Path) -> AppResult<()> {
    #[cfg(target_os = "windows")]
    let program = "explorer";
    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(all(unix, not(target_os = "macos")))]
    let program = "xdg-open";

    // explorer 打开成功也可能返回非零退出码,故只在无法启动(找不到程序)时报错。
    std::process::Command::new(program)
        .arg(path)
        .spawn()
        .map_err(|e| AppError::Process(format!("打开文件管理器失败: {}", e)))?;
    Ok(())
}

/// 列出所有前端日志文件
#[tauri::command]
pub fn list_log_files() -> AppResult<Vec<LogFile>> {
    log_service::list_log_files()
}

/// 读取日志文件内容
#[tauri::command]
pub fn get_log_content(file_name: String) -> AppResult<String> {
    log_service::get_log_content(&file_name)
}

/// 导出日志为压缩包，返回临时文件路径
#[tauri::command]
pub fn export_logs() -> AppResult<String> {
    let bytes = log_service::export_logs()?;
    // 保存到临时文件并返回路径
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let zip_path = std::env::temp_dir().join(format!("mailauncher_logs_{}.zip", timestamp));
    std::fs::write(&zip_path, &bytes)?;
    Ok(zip_path.to_string_lossy().to_string())
}

/// 清空所有前端日志文件
#[tauri::command]
pub fn clear_logs() -> AppResult<()> {
    log_service::clear_logs()
}

/// 全局最近错误/警告(首页"全局日志墙"供数)。
///
/// 遍历所有实例,读取各自 MaiBot 结构化日志尾部(read_logs 取末 200 条),筛 level 属于
/// ERROR/WARN(大小写不敏感),打上来源实例 id/name 后合并;按 ts 倒序、截断到 limit(默认 100)。
/// 单实例读取失败(日志目录缺失/未启动等)忽略,不中断整体聚合。
#[tauri::command]
pub async fn get_recent_errors(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> AppResult<Vec<AggregatedLogRecord>> {
    let cap = limit.unwrap_or(100);
    let instances = instance_service::get_all_instances(&state.db)
        .await?
        .instances;

    let mut aggregated: Vec<AggregatedLogRecord> = Vec::new();
    for instance in &instances {
        let instance_root = crate::utils::platform::get_instances_dir().join(
            instance
                .instance_path
                .clone()
                .unwrap_or_else(|| instance.name.clone()),
        );
        // 单实例读取失败不应拖垮整体聚合(日志目录可能尚未生成)。
        let chunk = match maibot_log::read_logs(&instance_root, None, 200) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for rec in chunk.records {
            let level_upper = rec.level.to_uppercase();
            if level_upper != "ERROR" && level_upper != "WARN" {
                continue;
            }
            aggregated.push(AggregatedLogRecord {
                instance_id: instance.id.clone(),
                instance_name: instance.name.clone(),
                ts: rec.ts,
                level: rec.level,
                module: rec.module,
                message: rec.message,
            });
        }
    }

    // 按 ts 倒序(最新在前);ts 为 ISO 风格字符串,字典序与时间序一致。
    aggregated.sort_by(|a, b| b.ts.cmp(&a.ts));
    aggregated.truncate(cap);
    Ok(aggregated)
}

// ==================== 麦麦历史日志文件命令 ====================

/// 解析实例的部署根目录(与 `commands::instance::get_maibot_logs` 保持一致的路径规则)。
async fn resolve_instance_root(
    db: &sqlx::SqlitePool,
    instance_id: &str,
) -> AppResult<std::path::PathBuf> {
    let instance = instance_service::get_instance(db, instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    Ok(crate::utils::platform::get_instances_dir().join(
        instance
            .instance_path
            .unwrap_or_else(|| instance.name.clone()),
    ))
}

/// 列出指定实例的麦麦历史日志轮转文件(供前端历史日志选择器展示)。
#[tauri::command]
pub async fn list_maibot_log_files(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<Vec<maibot_log::MaibotLogFileInfo>> {
    let instance_root = resolve_instance_root(&state.db, &instance_id).await?;
    maibot_log::list_log_files(&instance_root)
}

/// 一次性读取指定实例的某个麦麦历史日志文件全部(或末尾 `tail_limit` 条)记录。
///
/// 非增量读取(区别于 `get_maibot_logs` 的游标增量),供前端"选中历史文件后整份加载 + 本地检索"使用。
#[tauri::command]
pub async fn read_maibot_log_file(
    state: State<'_, AppState>,
    instance_id: String,
    file_name: String,
    tail_limit: Option<usize>,
) -> AppResult<Vec<maibot_log::MaibotLogRecord>> {
    let instance_root = resolve_instance_root(&state.db, &instance_id).await?;
    maibot_log::read_log_file(&instance_root, &file_name, tail_limit)
}

// ==================== 消息队列命令 ====================

/// 获取单个实例的消息队列
#[tauri::command]
pub async fn get_instance_message_queue(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<MessageQueueResponse> {
    message_queue_service::get_instance_queue(&state.db, &state.maisaka_monitor, &instance_id).await
}

/// 获取所有实例的消息队列
#[tauri::command]
pub async fn get_all_message_queues(
    state: State<'_, AppState>,
) -> AppResult<Vec<MessageQueueResponse>> {
    message_queue_service::get_all_queues(&state.db, &state.maisaka_monitor).await
}
