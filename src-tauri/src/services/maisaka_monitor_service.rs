//! 麦麦活动(在途会话)实时桥
//!
//! 现代 MaiBot 不是 FIFO 消息队列模型,而是"每会话一个常驻推理循环"。它把每个会话当前
//! 所处的推理阶段维护在进程内存(MaisakaStageStatusBoard),只经 WebUI 统一 WebSocket
//! (domain=`maisaka_monitor`)对外广播,DB / 日志都读不到。本模块即该 WS 的客户端桥:
//! 订阅后把"正在处理的会话"折算成 [`MessageQueueItem`],供首页"麦麦活动"卡的在途区读取。
//!
//! 鉴权:读实例 `MaiBot/data/webui.json` 的 `access_token`,握手时作为 `maibot_session`
//! Cookie(MaiBot 的 WS 鉴权接受 Cookie,无需先换一次性 ws-token)。
//! 端口:读实例 `MaiBot/config/bot_config.toml` 的 `[webui].port`(默认 8001)。
//! 一个后台 reconciler 周期对齐"运行中实例 ↔ 订阅任务";任务断线自带退避重连。

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use tokio::sync::{Mutex, RwLock};
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::header::COOKIE;
use tokio_tungstenite::tungstenite::Message;
use tracing::debug;

use crate::models::message_queue::MessageQueueItem;
use crate::services::process_service::ProcessManager;
use crate::utils::platform;

/// reconciler 巡检间隔(秒)。
const RECONCILE_SECS: u64 = 5;
/// WS 断线重连退避(秒)。
const RECONNECT_BACKOFF_SECS: u64 = 5;

/// MaiSaka 阶段条目(直接对齐 WS `stage.status` / `stage.snapshot.entries[]` 载荷)。
#[derive(Clone, Default, Deserialize)]
struct StageEntry {
    session_id: String,
    #[serde(default)]
    session_name: String,
    #[serde(default)]
    stage: String,
    #[serde(default)]
    detail: String,
    #[serde(default)]
    round_text: String,
    #[serde(default)]
    agent_state: String,
    #[serde(default)]
    stage_started_at: f64,
}

/// 单实例监控快照(供命令读取)。
#[derive(Default)]
struct MonitorSnapshot {
    /// WS 是否已连上并订阅成功。
    connected: bool,
    /// session_id -> 当前阶段条目。
    sessions: HashMap<String, StageEntry>,
}

/// 单实例的订阅任务句柄。
struct MonitorTask {
    snapshot: Arc<RwLock<MonitorSnapshot>>,
    handle: JoinHandle<()>,
}

/// MaiSaka 监控注册表(克隆共享;持有各实例的订阅任务与实时快照)。
#[derive(Clone, Default)]
pub struct MaisakaMonitor {
    tasks: Arc<Mutex<HashMap<String, MonitorTask>>>,
}

impl MaisakaMonitor {
    pub fn new() -> Self {
        Self::default()
    }

    /// 读取某实例当前"正在处理的会话"快照:`(ws 已连接, 在途条目)`。
    pub async fn snapshot(&self, instance_id: &str) -> (bool, Vec<MessageQueueItem>) {
        let tasks = self.tasks.lock().await;
        let Some(task) = tasks.get(instance_id) else {
            return (false, vec![]);
        };
        let snap = task.snapshot.read().await;
        let items = snap.sessions.values().map(stage_to_item).collect();
        (snap.connected, items)
    }

    async fn has(&self, instance_id: &str) -> bool {
        self.tasks.lock().await.contains_key(instance_id)
    }

    /// 为某实例启动订阅任务(连 WS、订阅、维护快照、断线重连)。
    async fn start(&self, instance_id: &str, host: String, port: u16, token: String) {
        let snapshot = Arc::new(RwLock::new(MonitorSnapshot::default()));
        let snap_for_task = snapshot.clone();
        let label = instance_id.to_string();
        let handle = tokio::spawn(async move {
            run_monitor(label, host, port, token, snap_for_task).await;
        });
        self.tasks
            .lock()
            .await
            .insert(instance_id.to_string(), MonitorTask { snapshot, handle });
    }

    /// 只保留 `want` 中的实例监控,其余中止并移除。
    async fn retain(&self, want: &HashSet<String>) {
        let mut tasks = self.tasks.lock().await;
        tasks.retain(|id, task| {
            let keep = want.contains(id);
            if !keep {
                task.handle.abort();
            }
            keep
        });
    }
}

/// 阶段条目 → 在途项。status 由 stage + agent_state 推导,与前端 MessageStatus 对齐。
fn stage_to_item(entry: &StageEntry) -> MessageQueueItem {
    MessageQueueItem {
        id: entry.session_id.clone(),
        stream_id: entry.session_id.clone(),
        group_name: (!entry.session_name.is_empty()).then(|| entry.session_name.clone()),
        status: map_stage_status(&entry.stage, &entry.agent_state),
        cycle_count: parse_round(&entry.round_text),
        retry_count: 0,
        retry_reason: None,
        action_type: (!entry.detail.is_empty()).then(|| entry.detail.clone()),
        start_time: entry.stage_started_at,
        sent_time: None,
        message_preview: None,
    }
}

/// 把 MaiSaka 阶段名 + agent_state 映射到前端 MessageStatus 字面量。
/// 阶段名为中英混合(Timing Gate / Planner / 等待消息 / 启动循环 / 本轮处理结束 …),
/// 这里取近似语义;映射只影响状态色点与标签,非数值正确性。
fn map_stage_status(stage: &str, agent_state: &str) -> String {
    let s = stage.to_ascii_lowercase();
    if agent_state == "stop" {
        return "sent".to_string();
    }
    if s.contains("planner") {
        return "planning".to_string();
    }
    if s.contains("replyer") || stage.contains("生成") || stage.contains("回复") {
        return "generating".to_string();
    }
    if s.contains("timing")
        || stage.contains("门")
        || stage.contains("等待")
        || agent_state == "wait"
    {
        return "pending".to_string();
    }
    "planning".to_string()
}

/// 从 round_text(如"第 2 轮"/"2/3")里抠出首个整数作为循环计数;无则 0。
fn parse_round(round_text: &str) -> i64 {
    let digits: String = round_text
        .chars()
        .skip_while(|c| !c.is_ascii_digit())
        .take_while(|c| c.is_ascii_digit())
        .collect();
    digits.parse().unwrap_or(0)
}

/// 单实例订阅主循环:连接→订阅→读事件维护快照;断线后清空快照、退避重连。
/// 该任务由 [`MaisakaMonitor::retain`] 通过 abort 终止。
async fn run_monitor(
    label: String,
    host: String,
    port: u16,
    token: String,
    snapshot: Arc<RwLock<MonitorSnapshot>>,
) {
    loop {
        if let Err(e) = connect_and_stream(&host, port, &token, &snapshot).await {
            debug!("[麦麦活动] {label} {host}:{port} WS 断开/失败: {e}");
        }
        {
            let mut snap = snapshot.write().await;
            snap.connected = false;
            snap.sessions.clear();
        }
        tokio::time::sleep(Duration::from_secs(RECONNECT_BACKOFF_SECS)).await;
    }
}

/// 建立一次 WS 连接并持续读取,直到断开/出错返回。
async fn connect_and_stream(
    host: &str,
    port: u16,
    token: &str,
    snapshot: &Arc<RwLock<MonitorSnapshot>>,
) -> Result<(), String> {
    let url = format!("ws://{host}:{port}/api/webui/ws");
    let mut request = url
        .into_client_request()
        .map_err(|e| format!("构造 WS 请求失败: {e}"))?;
    let cookie = format!("maibot_session={token}")
        .parse()
        .map_err(|_| "Cookie 头非法".to_string())?;
    request.headers_mut().insert(COOKIE, cookie);

    let (ws, _resp) = tokio_tungstenite::connect_async(request)
        .await
        .map_err(|e| format!("WS 连接失败: {e}"))?;
    let (mut write, mut read) = ws.split();

    let subscribe = r#"{"op":"subscribe","domain":"maisaka_monitor","topic":"main"}"#;
    write
        .send(Message::text(subscribe))
        .await
        .map_err(|e| format!("订阅发送失败: {e}"))?;

    snapshot.write().await.connected = true;

    while let Some(msg) = read.next().await {
        match msg.map_err(|e| format!("WS 读取失败: {e}"))? {
            Message::Text(txt) => handle_frame(txt.as_str(), snapshot).await,
            Message::Ping(payload) => {
                let _ = write.send(Message::Pong(payload)).await;
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
    Ok(())
}

/// 客户端事件信封。
#[derive(Deserialize)]
struct Frame {
    op: Option<String>,
    domain: Option<String>,
    event: Option<String>,
    data: Option<serde_json::Value>,
}

/// 处理一帧 WS 文本消息,更新快照中的会话阶段表。
async fn handle_frame(txt: &str, snapshot: &Arc<RwLock<MonitorSnapshot>>) {
    let Ok(frame) = serde_json::from_str::<Frame>(txt) else {
        return;
    };
    if frame.op.as_deref() != Some("event") || frame.domain.as_deref() != Some("maisaka_monitor") {
        return;
    }
    let (Some(event), Some(data)) = (frame.event.as_deref(), frame.data) else {
        return;
    };

    match event {
        "stage.snapshot" => {
            let entries = data
                .get("entries")
                .and_then(|e| e.as_array())
                .cloned()
                .unwrap_or_default();
            let mut snap = snapshot.write().await;
            snap.sessions.clear();
            for raw in entries {
                if let Ok(entry) = serde_json::from_value::<StageEntry>(raw) {
                    snap.sessions.insert(entry.session_id.clone(), entry);
                }
            }
        }
        "stage.status" => {
            if let Ok(entry) = serde_json::from_value::<StageEntry>(data) {
                snapshot
                    .write()
                    .await
                    .sessions
                    .insert(entry.session_id.clone(), entry);
            }
        }
        "stage.removed" => {
            if let Some(sid) = data.get("session_id").and_then(|s| s.as_str()) {
                snapshot.write().await.sessions.remove(sid);
            }
        }
        _ => {}
    }
}

/// 读取实例 WebUI 配置:`(host, port)`。未启用 / 读不到返回 None。host=0.0.0.0 归一为 127.0.0.1。
fn read_webui_config(instance_path: &str) -> Option<(String, u16)> {
    let cfg = platform::get_instances_dir()
        .join(instance_path)
        .join("MaiBot")
        .join("config")
        .join("bot_config.toml");
    let text = std::fs::read_to_string(&cfg).ok()?;
    let value: toml::Value = toml::from_str(&text).ok()?;
    let webui = value.get("webui")?;
    if !webui
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true)
    {
        return None;
    }
    let host = webui
        .get("host")
        .and_then(|v| v.as_str())
        .unwrap_or("127.0.0.1");
    let host = if host.is_empty() || host == "0.0.0.0" {
        "127.0.0.1".to_string()
    } else {
        host.to_string()
    };
    let port = webui
        .get("port")
        .and_then(|v| v.as_integer())
        .unwrap_or(8001) as u16;
    Some((host, port))
}

/// 读取实例 WebUI 会话令牌(`MaiBot/data/webui.json` 的 access_token)。
fn read_webui_token(instance_path: &str) -> Option<String> {
    let path = platform::get_instances_dir()
        .join(instance_path)
        .join("MaiBot")
        .join("data")
        .join("webui.json");
    let text = std::fs::read_to_string(&path).ok()?;
    let value: serde_json::Value = serde_json::from_str(&text).ok()?;
    value
        .get("access_token")
        .and_then(|t| t.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

/// 取实例的部署路径(instance_path 为空时回退实例名,与 config_service 口径一致)。
async fn fetch_instance_path(db: &SqlitePool, instance_id: &str) -> Option<String> {
    let row: Option<(Option<String>, String)> =
        sqlx::query_as("SELECT instance_path, name FROM instances WHERE id = ?")
            .bind(instance_id)
            .fetch_optional(db)
            .await
            .ok()
            .flatten();
    row.map(|(path, name)| path.unwrap_or(name))
}

/// 对齐"运行中实例 ↔ 订阅任务":停掉已停实例的监控,为新运行实例补建监控。
async fn reconcile(db: &SqlitePool, process_manager: &ProcessManager, monitor: &MaisakaMonitor) {
    // 本地托管运行中的组件 → 去重得运行中实例集合(一实例一 WebUI)。
    let want: HashSet<String> = process_manager
        .list_desired_running()
        .await
        .into_iter()
        .map(|(instance_id, _component)| instance_id)
        .collect();

    monitor.retain(&want).await;

    for id in &want {
        if monitor.has(id).await {
            continue;
        }
        let Some(path) = fetch_instance_path(db, id).await else {
            continue;
        };
        let Some((host, port)) = read_webui_config(&path) else {
            continue;
        };
        let Some(token) = read_webui_token(&path) else {
            continue;
        };
        monitor.start(id, host, port, token).await;
    }
}

/// 启动麦麦活动监控后台循环(随应用常驻,周期 reconcile)。
pub fn spawn_maisaka_monitor(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(RECONCILE_SECS));
        loop {
            ticker.tick().await;
            let state = app_handle.state::<crate::state::AppState>();
            reconcile(&state.db, &state.process_manager, &state.maisaka_monitor).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_round_extracts_first_integer() {
        assert_eq!(parse_round("第 2 轮"), 2);
        assert_eq!(parse_round("3/5"), 3);
        assert_eq!(parse_round("无数字"), 0);
        assert_eq!(parse_round(""), 0);
    }

    #[test]
    fn map_stage_status_covers_main_stages() {
        assert_eq!(map_stage_status("Planner", "running"), "planning");
        assert_eq!(map_stage_status("Timing Gate", "running"), "pending");
        assert_eq!(map_stage_status("等待消息", "wait"), "pending");
        assert_eq!(map_stage_status("本轮处理结束", "stop"), "sent");
        assert_eq!(map_stage_status("Replyer", "running"), "generating");
    }

    #[test]
    fn stage_to_item_maps_fields() {
        let entry = StageEntry {
            session_id: "g123".into(),
            session_name: "测试群".into(),
            stage: "Planner".into(),
            detail: "思考中".into(),
            round_text: "第 1 轮".into(),
            agent_state: "running".into(),
            stage_started_at: 1700.0,
        };
        let item = stage_to_item(&entry);
        assert_eq!(item.stream_id, "g123");
        assert_eq!(item.group_name.as_deref(), Some("测试群"));
        assert_eq!(item.status, "planning");
        assert_eq!(item.cycle_count, 1);
        assert_eq!(item.start_time, 1700.0);
    }
}
