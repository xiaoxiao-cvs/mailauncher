use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tracing::error;

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

#[derive(Debug, Clone)]
struct TerminalOutputMessage {
    instance_id: String,
    component: String,
    payload: String,
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

#[derive(Clone)]
pub struct ChannelTerminalStreamPublisher {
    sender: UnboundedSender<TerminalOutputMessage>,
    receiver: Arc<Mutex<Option<UnboundedReceiver<TerminalOutputMessage>>>>,
}

impl ChannelTerminalStreamPublisher {
    pub fn new() -> Self {
        let (sender, receiver) = unbounded_channel();
        Self {
            sender,
            receiver: Arc::new(Mutex::new(Some(receiver))),
        }
    }

    pub fn start_forwarder(&self, app_handle: AppHandle) {
        let receiver = self
            .receiver
            .lock()
            .ok()
            .and_then(|mut guard| guard.take());

        let Some(mut receiver) = receiver else {
            return;
        };

        tauri::async_runtime::spawn(async move {
            let event_publisher = EventTerminalStreamPublisher;
            while let Some(message) = receiver.recv().await {
                if let Err(error) = event_publisher.publish_output(
                    &app_handle,
                    &message.instance_id,
                    &message.component,
                    &message.payload,
                ) {
                    error!("终端输出转发失败: {}", error);
                }
            }
        });
    }
}

impl TerminalStreamPublisher for ChannelTerminalStreamPublisher {
    fn publish_output(
        &self,
        _app_handle: &AppHandle,
        instance_id: &str,
        component: &str,
        payload: &str,
    ) -> AppResult<()> {
        self.sender.send(TerminalOutputMessage {
            instance_id: instance_id.to_string(),
            component: component.to_string(),
            payload: payload.to_string(),
        })
        .map_err(|error| crate::errors::AppError::Internal(format!("发送终端输出消息失败: {}", error)))
    }
}

pub fn terminal_output_event_name(instance_id: &str, component: &str) -> String {
    format!("terminal-output-{}::{}", instance_id, component)
}