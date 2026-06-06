/// 实例管理 Tauri 命令
///
/// 对应前端 `instanceApi.ts` 的方法签名。
/// 每个命令通过 `State<AppState>` 获取数据库连接池，
/// 委托 `instance_service` 执行实际业务逻辑。
use tauri::State;

use crate::errors::{AppError, AppResult};
use crate::models::{
    CreateInstanceRequest, Instance, InstanceList, InstanceStatusResponse, SuccessResponse,
    UpdateInstanceRequest,
};
use crate::services::instance_service;
use crate::state::AppState;

/// 获取所有实例列表
#[tauri::command]
pub async fn get_all_instances(state: State<'_, AppState>) -> AppResult<InstanceList> {
    instance_service::get_all_instances(&state.db).await
}

/// 获取单个实例详情
#[tauri::command]
pub async fn get_instance(state: State<'_, AppState>, instance_id: String) -> AppResult<Instance> {
    instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))
}

/// 获取实例运行状态
#[tauri::command]
pub async fn get_instance_status(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<InstanceStatusResponse> {
    instance_service::get_instance_status(
        &state.db,
        &instance_id,
        &state.process_manager,
        &state.component_registry,
    )
    .await?
    .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))
}

/// 创建新实例
#[tauri::command]
pub async fn create_instance(
    state: State<'_, AppState>,
    data: CreateInstanceRequest,
) -> AppResult<Instance> {
    instance_service::create_instance(&state.db, data).await
}

/// 更新实例配置
#[tauri::command]
pub async fn update_instance(
    state: State<'_, AppState>,
    instance_id: String,
    data: UpdateInstanceRequest,
) -> AppResult<Instance> {
    instance_service::update_instance(&state.db, &instance_id, data)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))
}

/// 删除实例
#[tauri::command]
pub async fn delete_instance(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<SuccessResponse> {
    let deleted = instance_service::delete_instance(&state.db, &instance_id).await?;
    if deleted {
        Ok(SuccessResponse::ok(format!("实例 {} 已删除", instance_id)))
    } else {
        Err(AppError::NotFound(format!("实例 {} 不存在", instance_id)))
    }
}

/// NapCat 账号信息
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NapCatAccountsResponse {
    pub accounts: Vec<NapCatAccount>,
}

/// 单个 NapCat 账号
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NapCatAccount {
    pub account: String,
    pub nickname: String,
}

/// 获取 NapCat 已登录账号列表
///
/// 扫描实例目录下 NapCat/config/ 中的数字命名子目录，
/// 每个子目录名即为一个 QQ 账号。
#[tauri::command]
pub async fn get_napcat_accounts(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<NapCatAccountsResponse> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;

    let instances_dir = crate::utils::platform::get_instances_dir();
    let instance_path = instance
        .instance_path
        .unwrap_or_else(|| instance.name.clone());
    let napcat_config_dir = instances_dir
        .join(&instance_path)
        .join("NapCat")
        .join("config");

    let mut accounts = Vec::new();

    if napcat_config_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&napcat_config_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                // NapCat 以 QQ 号命名目录（纯数字）
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false)
                    && name.chars().all(|c| c.is_ascii_digit())
                    && !name.is_empty()
                {
                    accounts.push(NapCatAccount {
                        account: name.clone(),
                        nickname: name,
                    });
                }
            }
        }
    }

    Ok(NapCatAccountsResponse { accounts })
}

/// 获取麦麦(MaiBot)结构化日志增量(读 `MaiBot/logs/app_*.log.jsonl`,而非解析 PTY 的 ANSI 终端流)。
///
/// `cursor` 传上次返回的游标做增量,首次传 None 取尾部;返回新日志 + 推进后的游标。
#[tauri::command]
pub async fn get_maibot_logs(
    state: State<'_, AppState>,
    instance_id: String,
    cursor: Option<crate::services::maibot_log::MaibotLogCursor>,
) -> AppResult<crate::services::maibot_log::MaibotLogChunk> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let instance_path = crate::utils::platform::get_instances_dir().join(
        instance
            .instance_path
            .unwrap_or_else(|| instance.name.clone()),
    );
    crate::services::maibot_log::read_logs(&instance_path, cursor, 800)
}

/// NapCat 登录二维码。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NapcatQrCode {
    /// PNG 的 data URL(`data:image/png;base64,...`)
    pub data_url: String,
    /// PNG 修改时间(毫秒);前端据此判断二维码是否新鲜(=正在等扫码)
    pub mtime_ms: u64,
}

/// NapCat 登录成功的日志标记。等扫码阶段不会出现,登录后必现其一:
/// "登录成功"(QR 登录成功)、"适配器初始化完成"(登录后才初始化协议适配器)、
/// "接收 <-"(已在线并收到消息)。命中任一即视为已登录。
const NAPCAT_LOGIN_MARKERS: &[&str] = &["登录成功", "适配器初始化完成", "接收 <-"];

/// 从 NapCat 进程最近输出判断是否已登录(纯函数,便于单测)。
fn napcat_login_detected(lines: &[String]) -> bool {
    lines
        .iter()
        .any(|line| NAPCAT_LOGIN_MARKERS.iter().any(|m| line.contains(m)))
}

/// 读取 NapCat 登录二维码。NapCat 在等扫码登录时把二维码存为 `<实例>/NapCat/cache/qrcode.png`,
/// 本命令读出转 data URL 推前端展示,免去看终端字符二维码。文件不存在(未在等扫码/已登录)返回 None。
#[tauri::command]
pub async fn get_napcat_qrcode(
    state: State<'_, AppState>,
    instance_id: String,
) -> AppResult<Option<NapcatQrCode>> {
    let instance = instance_service::get_instance(&state.db, &instance_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("实例 {} 不存在", instance_id)))?;
    let path = crate::utils::platform::get_instances_dir()
        .join(
            instance
                .instance_path
                .unwrap_or_else(|| instance.name.clone()),
        )
        .join("NapCat")
        .join("cache")
        .join("qrcode.png");
    if !path.is_file() {
        return Ok(None);
    }
    // 已登录即收回:扫 NapCat 进程最近输出,命中登录成功标记则返回 None,
    // 让前端立即撤掉作废的二维码(不必等 png 的 mtime 转旧才消失)。
    let recent = state
        .process_manager
        .get_output_history(&instance_id, "NapCat", 200)
        .await;
    if napcat_login_detected(&recent) {
        return Ok(None);
    }
    let bytes = std::fs::read(&path)?;
    let mtime_ms = std::fs::metadata(&path)?
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(Some(NapcatQrCode {
        data_url: format!("data:image/png;base64,{}", b64),
        mtime_ms,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn login_detected_on_adapter_init() {
        let lines = vec![
            "[AdapterManager] 开始初始化协议适配器...".to_string(),
            "[AdapterManager] OneBot11 适配器初始化完成".to_string(),
        ];
        assert!(napcat_login_detected(&lines));
    }

    #[test]
    fn login_detected_on_success_marker() {
        assert!(napcat_login_detected(&["登录成功".to_string()]));
    }

    #[test]
    fn login_detected_on_receiving_message() {
        let lines = vec!["接收 <- 群聊 [测试群(123)] [某人(456)] 在吗".to_string()];
        assert!(napcat_login_detected(&lines));
    }

    #[test]
    fn not_logged_in_while_waiting_for_scan() {
        // 等扫码阶段的典型输出,无任何登录标记,二维码应保留
        let lines = vec![
            "二维码已保存到 .../NapCat/cache/qrcode.png".to_string(),
            "二维码解码URL: https://txz.qq.com/p?k=xxx&f=1600001604".to_string(),
            "如果控制台二维码无法扫码,可以复制解码url到二维码生成网站再扫码".to_string(),
        ];
        assert!(!napcat_login_detected(&lines));
    }

    #[test]
    fn not_detected_on_empty() {
        assert!(!napcat_login_detected(&[]));
    }
}
