use tauri::{AppHandle, Emitter};

use crate::errors::AppResult;

pub trait TerminalStreamPublisher: Send + Sync {
    fn publish_output(
        &self,
        app_handle: &AppHandle,
        instance_id: &str,
        component: &str,
        payload: &str,
    ) -> AppResult<()>;
}

#[derive(Debug, Clone, Default)]
pub struct EventTerminalStreamPublisher;

impl TerminalStreamPublisher for EventTerminalStreamPublisher {
    fn publish_output(
        &self,
        app_handle: &AppHandle,
        instance_id: &str,
        component: &str,
        payload: &str,
    ) -> AppResult<()> {
        app_handle
            .emit(&terminal_output_event_name(instance_id, component), payload)
            .map_err(|error| crate::errors::AppError::Internal(format!("发送终端输出事件失败: {}", error)))
    }
}

pub fn terminal_output_event_name(instance_id: &str, component: &str) -> String {
    format!("terminal-output-{}::{}", instance_id, component)
}