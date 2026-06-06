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
    let mut list = instance_service::get_all_instances(&state.db).await?;

    // 为运行中的实例补实时资源:按运行组件的 PID 用 sysinfo 累加 CPU/内存,并以最长存活组件的
    // uptime 作为实例运行时长。list_desired_running 返回 (instance_id, 组件 internal_key),
    // 已滤掉外部(WSL2)会话。CPU 首个采样周期可能为 0(sysinfo 需两次刷新),随轮询稳定。
    let running = state.process_manager.list_desired_running().await;
    let mut agg: std::collections::HashMap<String, (f64, f64, Option<f64>)> =
        std::collections::HashMap::new();
    for (iid, comp) in &running {
        let (cpu, mem) = state.process_manager.get_process_resources(iid, comp).await;
        let uptime = state.process_manager.get_process_uptime(iid, comp).await;
        let entry = agg.entry(iid.clone()).or_insert((0.0, 0.0, None));
        entry.0 += cpu;
        entry.1 += mem;
        if let Some(u) = uptime {
            entry.2 = Some(entry.2.map_or(u, |prev| prev.max(u)));
        }
    }
    for inst in list.instances.iter_mut() {
        if let Some((cpu, mem, uptime)) = agg.get(&inst.id) {
            if *cpu > 0.0 {
                inst.cpu_usage = Some(*cpu);
            }
            if *mem > 0.0 {
                inst.memory_usage = Some(*mem);
            }
            if let Some(u) = uptime {
                inst.run_time = *u as i64;
            }
        }
    }

    Ok(list)
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

/// NapCat 等扫码阶段的日志标记(每次生成/刷新登录二维码都会打印其一)。
const NAPCAT_QR_MARKERS: &[&str] = &["二维码已保存", "二维码解码URL"];
/// NapCat 登录成功的日志标记(等扫码阶段不会出现,登录后必现其一):
/// "登录成功"(QR 登录成功)、"适配器初始化完成"(登录后才初始化协议适配器)、
/// "接收 <-"(已在线并收到消息)。
const NAPCAT_LOGIN_MARKERS: &[&str] = &["登录成功", "适配器初始化完成", "接收 <-"];

/// 依据 NapCat 进程的有序输出行缓冲判断"当前是否应展示登录二维码"(纯函数,便于单测)。
///
/// 比较"最后一条等扫码标记"与"最后一条登录成功标记"的先后位置:
/// 等扫码标记更靠后(更新)= 当前在等扫码(含会话中途过期后重新弹码)→ 展示;
/// 登录标记更靠后 = 已登录 → 收回;两者都无 = 信息不足,交给前端 mtime 兜底。
fn napcat_waiting_for_scan(lines: &[String]) -> bool {
    let last_idx = |markers: &[&str]| -> Option<usize> {
        lines
            .iter()
            .rposition(|line| markers.iter().any(|m| line.contains(m)))
    };
    match (last_idx(NAPCAT_QR_MARKERS), last_idx(NAPCAT_LOGIN_MARKERS)) {
        (Some(qr), Some(login)) => qr > login,
        (Some(_), None) => true,
        (None, Some(_)) => false,
        (None, None) => true,
    }
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
    // 比较 NapCat 输出里"最后一次等扫码标记"与"最后一次登录成功标记"的先后:
    // 已登录(登录标记更靠后)就返回 None 让前端立即收回;会话中途过期重新弹码时,
    // 新的等扫码标记又会更靠后 → 自动重新展示。比纯 mtime 更准,能处理反复过期。
    // NapCat 进程会话按组件 internal_key 注册(非显示名 "NapCat"),必须经注册表解析,
    // 否则按 "NapCat" 查不到会话、拿到空输出,导致登录后永远判定为"仍在等扫码"而不收回。
    let recent = match state.component_registry.get_by_value("NapCat") {
        Some(spec) => {
            state
                .process_manager
                .get_output_history(&instance_id, spec.component.internal_key(), 400)
                .await
        }
        None => Vec::new(),
    };
    if !napcat_waiting_for_scan(&recent) {
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

    fn lines(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn waiting_when_qr_present_and_no_login() {
        assert!(napcat_waiting_for_scan(&lines(&[
            "二维码已保存到 .../NapCat/cache/qrcode.png",
            "二维码解码URL: https://txz.qq.com/p?k=xxx&f=1600001604",
        ])));
    }

    #[test]
    fn retract_when_login_after_qr() {
        assert!(!napcat_waiting_for_scan(&lines(&[
            "二维码已保存到 .../qrcode.png",
            "[AdapterManager] OneBot11 适配器初始化完成",
        ])));
    }

    #[test]
    fn waiting_again_on_relogin_qr_after_login() {
        // 会话中途过期重新弹码:登录标记在前、新的等扫码标记在后 → 重新展示
        assert!(napcat_waiting_for_scan(&lines(&[
            "[AdapterManager] OneBot11 适配器初始化完成",
            "接收 <- 群聊 [群(1)] [人(2)] 在吗",
            "二维码已保存到 .../qrcode.png",
            "二维码解码URL: https://txz.qq.com/p?k=yyy",
        ])));
    }

    #[test]
    fn retract_when_received_message_after_qr() {
        // 扫码登录后又收到消息(登录标记在后)→ 收回
        assert!(!napcat_waiting_for_scan(&lines(&[
            "二维码已保存到 .../qrcode.png",
            "接收 <- 群聊 [群(1)] [人(2)] 你好",
        ])));
    }

    #[test]
    fn retract_when_only_login_marker() {
        assert!(!napcat_waiting_for_scan(&lines(&["登录成功"])));
    }

    #[test]
    fn show_when_no_markers_defer_to_mtime() {
        assert!(napcat_waiting_for_scan(&[]));
    }
}
