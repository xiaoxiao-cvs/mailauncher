/// 版本管理 Tauri 命令
///
/// 对应前端版本查询、组件更新、备份恢复等 API。
use tauri::{AppHandle, Emitter, State};
use tracing::info;

use crate::errors::{AppError, AppResult};
use crate::models::download::DownloadItemType;
use crate::models::update::*;
use crate::models::{SuccessResponse, UpdateHistory, VersionBackup};
use crate::services::{install_service, version_service};
use crate::state::AppState;

// ==================== 辅助：获取实例基础目录 ====================

/// 从实例 ID 解析出实例基础目录
async fn resolve_instance_base_dir(
    pool: &sqlx::SqlitePool,
    instance_id: &str,
) -> AppResult<std::path::PathBuf> {
    let instance = crate::services::instance_service::get_instance(pool, instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let instance_path = instance
        .instance_path
        .ok_or_else(|| AppError::NotFound("实例路径未设置".to_string()))?;
    Ok(crate::utils::platform::get_instances_dir().join(&instance_path))
}

// ==================== 命令 ====================

/// 获取实例各组件版本信息
///
/// 对应 Python GET `/instances/{id}/components/version`
#[tauri::command]
pub async fn get_instance_components_version(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<Vec<ComponentVersionInfo>> {
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    version_service::get_instance_components_version(&state.db, &instance_id, &base_dir).await
}

/// 检查单个组件是否有更新
///
/// 对应 Python GET `/instances/{id}/components/{component}/check-update`
///
/// Release 型组件(目前仅 NapCat)按 Release tag 走独立检查分支(见 P2-22)：
/// 该类组件不是 git 检出，用 commit 对比逻辑既拿不到本地 commit，也与用户实际安装的
/// Release 包版本无关。
#[tauri::command]
pub async fn check_component_update(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
) -> AppResult<ComponentUpdateCheck> {
    let item_type = parse_component_type(&component)?;
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;

    // 更新策略以组件分发形态为唯一判据(见 version_service::resolve_update_strategy):
    // Release 型(NapCat)无 .git,既不能用 commit 对比检查、也不能 git pull 更新。
    match version_service::resolve_update_strategy(&item_type) {
        version_service::ComponentUpdateStrategy::ReleaseZip => {
            version_service::check_release_component_update(&item_type, &base_dir).await
        }
        version_service::ComponentUpdateStrategy::Git => {
            version_service::check_component_update(&state.db, &instance_id, &item_type, &base_dir)
                .await
        }
    }
}

/// 更新组件到最新版本，或（`target_version` 非空时）回滚到指定历史 commit。
///
/// 对应 Python POST `/instances/{id}/components/{component}/update`
///
/// - Release 型组件(目前仅 NapCat，见 P2-22)：不支持 `target_version`（Release 整包分发，
///   无历史 commit 概念），走 `update_release_component` 重新下载安装最新包。
/// - Git 型组件：`target_version` 为空时正常 `git pull`；非空时视为一次显式回滚（见 P2-23，
///   `list_component_commits` 供选择），跳过 pull 直接 checkout 目标 commit。
///   更新（非回滚）成功后追加执行 `install_dependencies`（见 P2-19/P2-20），
///   使 requirements 变化后自动补装，无需用户手动再点"重装依赖"。
#[tauri::command]
pub async fn update_component(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
    create_backup: Option<bool>,
    target_version: Option<String>,
) -> AppResult<SuccessResponse> {
    let item_type = parse_component_type(&component)?;
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;

    let repo = version_service::get_github_repo(&item_type);
    let component_dir = base_dir.join(repo.folder);

    // 更新策略以组件分发形态为唯一判据:Release 型(NapCat)走 zip 重下覆盖,永不 git pull。
    let strategy = version_service::resolve_update_strategy(&item_type);
    let is_release = matches!(strategy, version_service::ComponentUpdateStrategy::ReleaseZip);

    if is_release && target_version.is_some() {
        return Err(AppError::InvalidInput(
            "Release 型组件不支持按历史 commit 回滚".to_string(),
        ));
    }

    let event_name = format!("update-log-{}-{}", instance_id, component);

    // 记录更新前版本标识,作为 update_history 的 from_commit(成功/失败都要落库)。
    // git 型组件取 commit hash;release 型组件无 git 检出,退回读取本地版本号占位。
    let from_commit = version_service::get_local_commit(&component_dir)
        .or_else(|| version_service::get_local_version_from_file(&component_dir, &component))
        .unwrap_or_default();

    // 更新前自动备份配置与数据(代码由 Git 兜底无需备份);默认开,可显式传 false 关闭。
    // 备份失败直接中止更新——宁可不更新,也不让用户在没有退路的情况下动数据。
    let mut backup_id: Option<String> = None;
    if create_backup.unwrap_or(true) {
        let _ = app_handle.emit(&event_name, "正在备份配置与数据...");
        match version_service::backup_component_data(
            &state.db,
            &instance_id,
            &item_type,
            &component_dir,
        )
        .await?
        {
            Some(id) => {
                let _ = app_handle.emit(&event_name, format!("配置与数据已备份: {}", id));
                backup_id = Some(id);
            }
            None => {
                let _ = app_handle.emit(&event_name, "无配置/数据需备份,跳过");
            }
        }
    }

    // 执行更新。失败时也要落一条 failed 历史,再把原始错误抛给上层。
    let _ = app_handle.emit(&event_name, "正在更新组件...");
    let update_result = match strategy {
        version_service::ComponentUpdateStrategy::ReleaseZip => {
            version_service::update_release_component(&base_dir, &app_handle, &event_name).await
        }
        version_service::ComponentUpdateStrategy::Git => {
            version_service::update_component_git(
                &component_dir,
                target_version.as_deref(),
                &app_handle,
                &event_name,
            )
            .await
        }
    };

    if let Err(e) = update_result {
        let _ = version_service::record_update_history(
            &state.db,
            &instance_id,
            &component,
            &from_commit,
            None,
            "failed",
            backup_id.as_deref(),
            Some(&e.to_string()),
        )
        .await;
        return Err(e);
    }

    // requirements 可能随更新变化,git 型组件更新成功后立即补装依赖(P2-20)。
    // 回滚(target_version 非空)语义是"退回某个历史状态"而非"引入新依赖",不重装；
    // Release 型组件无 requirements.txt，install_dependencies 内部会直接判空跳过。
    if !is_release && target_version.is_none() {
        let venv_dir = base_dir.join(".venv");
        if venv_dir.exists() {
            let _ = app_handle.emit(&event_name, "正在检查并补装依赖...");
            install_service::install_dependencies(
                &component_dir,
                &venv_dir,
                &app_handle,
                &event_name,
            )
            .await?;
        }
    }

    // 记录更新历史:显式指定 target_version 视为一次回滚,与常规更新在历史里区分开。
    let to_commit = version_service::get_local_commit(&component_dir)
        .or_else(|| version_service::get_local_version_from_file(&component_dir, &component))
        .unwrap_or_default();
    let status = if target_version.is_some() {
        "rollback"
    } else {
        "success"
    };
    version_service::record_update_history(
        &state.db,
        &instance_id,
        &component,
        &from_commit,
        Some(&to_commit),
        status,
        backup_id.as_deref(),
        None,
    )
    .await?;

    let _ = app_handle.emit(&event_name, "组件更新完成");
    info!("组件更新完成: {} / {}", instance_id, component);

    Ok(SuccessResponse::ok("组件更新成功"))
}

/// 获取备份列表
///
/// 对应 Python GET `/instances/{id}/backups`
#[tauri::command]
pub async fn get_backups(
    state: State<'_, AppState>,
    instance_id: String,
    component: Option<String>,
) -> AppResult<Vec<VersionBackup>> {
    version_service::get_backups(&state.db, &instance_id, component.as_deref()).await
}

/// 恢复备份
#[tauri::command]
pub async fn restore_backup(
    state: State<'_, AppState>,
    instance_id: String,
    backup_id: String,
) -> AppResult<SuccessResponse> {
    // 查询备份记录
    let backup = sqlx::query_as::<_, VersionBackup>(
        "SELECT * FROM version_backups WHERE id = ? AND instance_id = ?",
    )
    .bind(&backup_id)
    .bind(&instance_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::Database(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("备份不存在".to_string()))?;

    // 恢复逻辑：将备份目录复制回组件目录
    let backup_path = std::path::PathBuf::from(&backup.backup_path);
    if !backup_path.exists() {
        return Err(AppError::FileSystem("备份文件已丢失".to_string()));
    }

    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    let component_dir = base_dir.join(&backup.component);

    // databak_ 前缀 = 更新前的"配置+数据"快照,叠加式恢复(只覆盖 config/data,保住代码);
    // 其它(旧式整目录备份)走整目录原子替换。
    if backup.id.starts_with("databak_") {
        version_service::restore_data_backup(&backup_path, &component_dir)?;
    } else {
        version_service::restore_full_backup(&backup_path, &component_dir)?;
    }

    info!(
        "恢复备份完成: {} / {} ← {}",
        instance_id, backup.component, backup_id
    );

    Ok(SuccessResponse::ok("备份恢复成功"))
}

/// 获取更新历史
///
/// 对应 Python GET `/instances/{id}/update-history`
#[tauri::command]
pub async fn get_update_history(
    state: State<'_, AppState>,
    instance_id: String,
    component: Option<String>,
    limit: Option<i64>,
) -> AppResult<Vec<UpdateHistory>> {
    version_service::get_update_history(&state.db, &instance_id, component.as_deref(), limit).await
}

/// 获取组件 GitHub Releases
///
/// 对应 Python GET `/versions/{component}/releases`
#[tauri::command]
pub async fn get_component_releases(
    component: String,
    limit: Option<usize>,
) -> AppResult<Vec<GitHubRelease>> {
    let item_type = parse_component_type(&component)?;
    let repo = version_service::get_github_repo(&item_type);
    version_service::get_releases(repo.owner, repo.name, limit).await
}

// ==================== 依赖重装 / 历史回滚 / 手动备份 / 数据重置 ====================

/// 重装实例依赖(P2-19)：删除并重建虚拟环境,逐组件重新安装 requirements.txt。
///
/// 危险但可恢复的操作——不动配置/数据/代码,仅重建 Python 依赖环境；
/// 通过 `reinstall-deps-log-{instance_id}` 事件推送实时日志。
#[tauri::command]
pub async fn reinstall_instance_dependencies(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    instance_id: String,
    python_path: Option<String>,
) -> AppResult<SuccessResponse> {
    let instance = crate::services::instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let instance_path = instance
        .instance_path
        .clone()
        .ok_or_else(|| AppError::NotFound("实例路径未设置".to_string()))?;
    let base_dir = crate::utils::platform::get_instances_dir().join(&instance_path);

    // 未显式传入 python_path 时,复用实例安装时记录的解释器路径,保证重装环境与初装一致;
    // 仍为空则交给 install_service::resolve_python 的自动探测(py -3 / python3 / python)。
    let effective_python_path = python_path.or(instance.python_path);

    let event_name = format!("reinstall-deps-log-{}", instance_id);

    install_service::reinstall_dependencies(
        &base_dir,
        effective_python_path.as_deref(),
        &app_handle,
        &event_name,
    )
    .await?;

    Ok(SuccessResponse::ok("依赖重装完成"))
}

/// 列出组件仓库本地可见的历史提交(P2-23)，供前端展示以选择回滚目标。
///
/// 只读，纯 `git log`。`limit` 未传时默认 30 条。
#[tauri::command]
pub async fn list_component_commits(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
    limit: Option<usize>,
) -> AppResult<Vec<version_service::ComponentCommitInfo>> {
    let item_type = parse_component_type(&component)?;
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    let repo = version_service::get_github_repo(&item_type);
    let component_dir = base_dir.join(repo.folder);

    version_service::list_component_commits(&component_dir, limit.unwrap_or(30))
}

/// 立即创建一份手动备份(P2-26)：快照组件当前 config/data,`manualbak_` 前缀,不受自动裁剪影响。
///
/// 返回备份 id；组件目录下既无 config 也无 data 时返回 `None`。
#[tauri::command]
pub async fn create_manual_backup(
    state: State<'_, AppState>,
    instance_id: String,
    component: String,
) -> AppResult<Option<String>> {
    let item_type = parse_component_type(&component)?;
    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    let repo = version_service::get_github_repo(&item_type);
    let component_dir = base_dir.join(repo.folder);

    version_service::create_manual_backup(&state.db, &instance_id, &item_type, &component_dir)
        .await
}

/// 重置实例数据(P1-13)：清空 `MaiBot/data` 目录(保留 `webui.json`)，不动配置/代码/实例记录。
///
/// 要求实例已停止——运行中的进程可能正持有 data 目录下文件句柄(如 SQLite 数据库)，
/// 边跑边删会导致进程崩溃或数据损坏。
#[tauri::command]
pub async fn reset_instance_data(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<SuccessResponse> {
    if state.process_manager.is_instance_running(&instance_id).await {
        return Err(AppError::InvalidInput(
            "实例正在运行,请先停止实例后再重置数据".to_string(),
        ));
    }

    let base_dir = resolve_instance_base_dir(&state.db, &instance_id).await?;
    version_service::reset_instance_data(&base_dir)?;

    Ok(SuccessResponse::ok("实例数据已重置"))
}

/// 检查启动器自身更新
///
/// 对应 Python GET `/updates/check`
#[tauri::command]
pub async fn check_launcher_update(channel: Option<String>) -> AppResult<UpdateCheckResponse> {
    let ch = channel.unwrap_or_else(|| "main".to_string());
    version_service::check_launcher_update(&ch).await
}

/// 获取启动器某渠道的版本列表
///
/// 对应 Python GET `/updates/versions`
#[tauri::command]
pub async fn get_channel_versions(
    channel: Option<String>,
    limit: Option<usize>,
) -> AppResult<ChannelVersionsResponse> {
    let ch = channel.unwrap_or_else(|| "main".to_string());
    version_service::get_channel_versions(&ch, limit).await
}

/// 安装启动器自更新(选定通道/版本):下载安装包 -> 用 updater 公钥验签 -> 拉起安装器并退出本应用。
///
/// Tauri updater 插件只能更到最新、不支持多通道+选版本,故走此自研路径,但沿用同一套签名校验
/// (与 tauri.conf 同一把公钥)。仅 Windows 支持应用内安装,其它平台引导手动下载。
/// 下载/安装进度经 `launcher-update-progress` 事件推送。
#[tauri::command]
pub async fn install_launcher_update(
    app: AppHandle,
    channel: String,
    version: Option<String>,
) -> AppResult<()> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, channel, version);
        Err(AppError::InvalidInput(
            "当前平台暂不支持应用内自更新,请到 Releases 页面手动下载安装".to_string(),
        ))
    }
    #[cfg(target_os = "windows")]
    {
        use crate::services::source_proxy_service;
        use tauri::Manager;

        let target = version_service::resolve_install_target(&channel, version.as_deref()).await?;
        // 安装包与签名同为 GitHub Release 资产,经当前启用的镜像前缀重写(与 git/uv/NapCat 走同一套源配置)。
        // 签名仍在下方用内置公钥校验,镜像即便返回损坏内容也会被 minisign 拦下,不牺牲安全。
        let gh_prefix =
            source_proxy_service::resolve_active_github_prefix(&app.state::<AppState>().db).await;
        let installer_url =
            source_proxy_service::apply_github_mirror(&target.installer_url, &gh_prefix);
        let sig_url = source_proxy_service::apply_github_mirror(&target.sig_url, &gh_prefix);
        info!(
            "[自更新] 目标版本 {},下载 {}",
            target.version, target.installer_name
        );
        let bytes = download_installer_with_progress(&app, &installer_url).await?;

        // 安全关键:用内置 updater 公钥校验签名,未过不安装
        let sig = version_service::fetch_text(&sig_url).await?;
        version_service::verify_launcher_signature(&bytes, &sig)?;
        info!("[自更新] 签名校验通过,准备安装 {}", target.version);

        let installer_path = std::env::temp_dir().join(&target.installer_name);
        std::fs::write(&installer_path, &bytes)?;
        let _ = app.emit(
            "launcher-update-progress",
            serde_json::json!({ "phase": "installing", "version": target.version }),
        );
        std::process::Command::new(&installer_path)
            .spawn()
            .map_err(|e| AppError::Process(format!("启动安装器失败: {}", e)))?;
        // 给安装器拉起的时间,随后退出本进程以便覆盖被占用的文件
        tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        app.exit(0);
        Ok(())
    }
}

/// 流式下载安装包,经 launcher-update-progress 事件回报下载进度。
#[cfg(target_os = "windows")]
async fn download_installer_with_progress(app: &AppHandle, url: &str) -> AppResult<Vec<u8>> {
    use futures_util::StreamExt;

    let resp = version_service::github_client()
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::Network(format!("下载安装包失败: {}", e)))?;
    if !resp.status().is_success() {
        return Err(AppError::Network(format!(
            "下载安装包失败: HTTP {}",
            resp.status()
        )));
    }
    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut buf: Vec<u8> = Vec::with_capacity(total as usize);
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(format!("下载中断: {}", e)))?;
        downloaded += chunk.len() as u64;
        buf.extend_from_slice(&chunk);
        let percent = if total > 0 {
            (downloaded as f64 / total as f64 * 100.0) as u32
        } else {
            0
        };
        let _ = app.emit(
            "launcher-update-progress",
            serde_json::json!({
                "phase": "downloading",
                "downloaded": downloaded,
                "total": total,
                "percent": percent
            }),
        );
    }
    Ok(buf)
}

// ==================== 工具函数 ====================

/// 解析组件类型字符串
fn parse_component_type(component: &str) -> AppResult<DownloadItemType> {
    match component.to_lowercase().as_str() {
        "maibot" | "mai-bot" => Ok(DownloadItemType::Maibot),
        "napcat" => Ok(DownloadItemType::Napcat),
        "napcat-adapter" | "napcatadapter" | "adapter" => Ok(DownloadItemType::NapcatAdapter),
        "lpmm" => Ok(DownloadItemType::Lpmm),
        _ => Err(AppError::InvalidInput(format!(
            "未知组件类型: {}",
            component
        ))),
    }
}
