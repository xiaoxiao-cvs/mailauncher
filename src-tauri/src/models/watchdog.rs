/// 看门狗只读状态模型
///
/// 首页"看门狗健康"卡供数:对每个期望运行的本地托管组件,给出其自动重启偏好与当前存活态。
/// 字段采用 snake_case(前端按 snake_case 读)。
use serde::Serialize;

/// 单个期望运行组件的看门狗只读状态。
///
/// 注:retry_count/next_attempt_at 为看门狗循环私有内存态,本结构不暴露,只读 autorestart_enabled
/// (config KV "autorestart:<instance_id>",缺省 true)与 is_alive(进程实时存活探测)。
#[derive(Debug, Clone, Serialize)]
pub struct WatchdogInstanceStatus {
    pub instance_id: String,
    pub instance_name: String,
    pub component: String,
    pub autorestart_enabled: bool,
    pub is_alive: bool,
}
