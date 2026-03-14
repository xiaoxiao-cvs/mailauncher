/// 统一响应数据模型
///
/// 保持与 Python 后端返回格式一致，便于前端平滑切换。
use serde::Serialize;

/// 通用 API 响应包装
///
/// 与 Python 后端的 `{"status": "...", "data": ..., "message": "..."}` 格式一致。
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct ApiResponse<T: Serialize> {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[allow(dead_code)]
impl<T: Serialize> ApiResponse<T> {
    /// 成功响应（携带数据）
    pub fn success(data: T) -> Self {
        Self {
            status: "success".to_string(),
            data: Some(data),
            message: None,
        }
    }

    /// 成功响应（仅消息）
    pub fn success_message(message: impl Into<String>) -> ApiResponse<()> {
        ApiResponse {
            status: "success".to_string(),
            data: None,
            message: Some(message.into()),
        }
    }

    /// 错误响应
    pub fn error(message: impl Into<String>) -> ApiResponse<()> {
        ApiResponse {
            status: "error".to_string(),
            data: None,
            message: Some(message.into()),
        }
    }
}
