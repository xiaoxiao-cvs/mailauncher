/// 应用统一错误类型
///
/// 使用 `thiserror` 派生，自动实现 Display 和 Error trait。
/// 实现 `serde::Serialize` 以支持 Tauri IPC 序列化传输。
use serde::Serialize;

/// 应用级错误枚举
///
/// 所有服务层和命令层的错误都统一为此类型，
/// Tauri 命令返回 `Result<T, AppError>` 时会自动序列化为前端可读的错误信息。
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// 数据库操作错误
    #[error("数据库错误: {0}")]
    Database(String),

    /// 文件系统操作错误
    #[error("文件系统错误: {0}")]
    FileSystem(String),

    /// 网络请求错误
    #[error("网络错误: {0}")]
    Network(String),

    /// 进程管理错误
    #[error("进程错误: {0}")]
    Process(String),

    /// 配置解析或验证错误
    #[error("配置错误: {0}")]
    Config(String),

    /// 资源未找到
    #[error("未找到: {0}")]
    NotFound(String),

    /// 参数验证失败
    #[error("参数无效: {0}")]
    InvalidInput(String),

    /// 内部逻辑错误
    #[error("内部错误: {0}")]
    Internal(String),
}

/// 为 Tauri IPC 实现序列化
///
/// Tauri 要求命令返回的错误类型实现 `Serialize`，
/// 这里将错误序列化为字符串形式，前端通过 `invoke` 的 catch 获取。
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// 从 sqlx::Error 自动转换
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

/// 从 std::io::Error 自动转换
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileSystem(err.to_string())
    }
}

/// 从 reqwest::Error 自动转换
impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::Network(err.to_string())
    }
}

/// 从 toml_edit::TomlError 自动转换
impl From<toml_edit::TomlError> for AppError {
    fn from(err: toml_edit::TomlError) -> Self {
        AppError::Config(err.to_string())
    }
}

/// 从 serde_json::Error 自动转换
impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Config(format!("JSON 解析错误: {}", err))
    }
}

/// 便捷类型别名
pub type AppResult<T> = Result<T, AppError>;
