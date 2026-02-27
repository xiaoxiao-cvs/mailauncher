// 错误处理模块
// 统一的错误类型定义，支持 Tauri 序列化

pub mod app_error;

// 重导出便捷使用
pub use app_error::{AppError, AppResult};
