// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::sync::Mutex as TokioMutex;
use warp::Filter;
use tauri::Manager;
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../dist/"]
struct Assets;

async fn serve_embedded_file(path: &str) -> Result<impl warp::Reply, warp::Rejection> {
    let path = if path.is_empty() || path == "/" {
        "index.html"
    } else {
        path
    };

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Ok(warp::reply::with_header(
                content.data.to_vec(),
                "content-type",
                mime.as_ref(),
            ))
        }
        None => {
            // 如果文件不存在，返回 index.html (SPA 路由)
            match Assets::get("index.html") {
                Some(content) => Ok(warp::reply::with_header(
                    content.data.to_vec(),
                    "content-type",
                    "text/html",
                )),
                None => Err(warp::reject::not_found()),
            }
        }
    }
}

struct BackendProcess(Mutex<Option<std::process::Child>>);

// WebUI 服务器结构
pub struct WebuiServer {
    server_handle: Arc<TokioMutex<Option<tokio::task::JoinHandle<()>>>>,
    port: u16,
    enabled: bool,
}

impl WebuiServer {
    pub fn new() -> Self {
        Self {
            server_handle: Arc::new(TokioMutex::new(None)),
            port: 11111,
            enabled: false,
        }
    }

    pub async fn start_server(&mut self, port: u16, frontend_dist: PathBuf) -> Result<(), String> {
        // 停止现有服务器
        self.stop_server().await;
        
        let addr: SocketAddr = ([0, 0, 0, 0], port).into();
        
        // 创建静态文件服务
        let static_files = warp::fs::dir(frontend_dist.clone());
        
        // 创建 SPA 路由处理 - 对所有非文件请求返回 index.html
        let spa_route = warp::path::full()
            .and(warp::get())
            .and_then(move |path: warp::path::FullPath| {
                let frontend_dist = frontend_dist.clone();
                async move {
                    let path_str = path.as_str();
                    
                    // 如果请求的是文件（包含扩展名），尝试返回文件
                    if path_str.contains('.') {
                        // 让静态文件处理器处理
                        Err(warp::reject::not_found())
                    } else {
                        // 否则返回 index.html（SPA 路由）
                        let index_path = frontend_dist.join("index.html");
                        match tokio::fs::read(index_path).await {
                            Ok(content) => Ok(warp::reply::html(String::from_utf8_lossy(&content).to_string())),
                            Err(_) => Err(warp::reject::not_found()),
                        }
                    }
                }
            });

        // API 代理 - 转发到后端服务
        let api_proxy = warp::path("api")
            .and(warp::path::full())
            .and(warp::method())
            .and(warp::header::headers_cloned())
            .and(warp::body::bytes())
            .and_then(|path: warp::path::FullPath, method: warp::http::Method, headers: warp::http::HeaderMap, body: bytes::Bytes| async move {
                let backend_url = format!("http://127.0.0.1:23456{}", path.as_str());
                
                let client = reqwest::Client::new();
                let mut request = match method {
                    warp::http::Method::GET => client.get(&backend_url),
                    warp::http::Method::POST => client.post(&backend_url),
                    warp::http::Method::PUT => client.put(&backend_url),
                    warp::http::Method::DELETE => client.delete(&backend_url),
                    warp::http::Method::PATCH => client.patch(&backend_url),
                    _ => return Err(warp::reject::not_found()),
                };

                // 转发请求头（过滤一些不需要的）
                for (name, value) in headers.iter() {
                    let name_str = name.as_str();
                    if !["host", "connection", "content-length"].contains(&name_str) {
                        request = request.header(name, value);
                    }
                }

                // 添加请求体
                if !body.is_empty() {
                    request = request.body(body);
                }

                match request.send().await {
                    Ok(response) => {
                        let status = response.status();
                        let body = response.bytes().await.unwrap_or_default();
                        
                        // 简化响应处理，直接返回状态码和内容
                        Ok(warp::reply::with_status(
                            body.to_vec(),
                            warp::http::StatusCode::from_u16(status.as_u16()).unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR)
                        ))
                    },
                    Err(_) => Err(warp::reject::not_found()),
                }
            });

        // WebSocket 代理
        let ws_proxy = warp::path("ws")
            .and(warp::ws())
            .map(|ws: warp::ws::Ws| {
                ws.on_upgrade(|_websocket| async {
                    // 实现 WebSocket 代理逻辑
                    // 这里可以转发到后端的 WebSocket 服务
                    println!("WebSocket connection established for WebUI");
                })
            });

        // 组合路由
        let routes = api_proxy
            .or(ws_proxy)
            .or(static_files)
            .or(spa_route)
            .with(warp::cors()
                .allow_any_origin()
                .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
                .allow_headers(vec!["content-type", "authorization"]));

        // 启动服务器
        let server = warp::serve(routes).run(addr);
        let handle = tokio::spawn(server);

        // 保存服务器句柄
        {
            let mut server_guard = self.server_handle.lock().await;
            *server_guard = Some(handle);
        }

        self.port = port;
        self.enabled = true;        println!("✅ WebUI 服务器已启动在端口: {}", port);
        Ok(())
    }

    pub async fn start_server_prod(&mut self, port: u16) -> Result<(), String> {
        // 停止现有服务器
        self.stop_server().await;
        
        let addr: SocketAddr = ([0, 0, 0, 0], port).into();
        
        // 生产模式下，使用嵌入的前端资源
        let embedded_static = warp::path::tail()
            .and(warp::get())
            .and_then(|tail: warp::path::Tail| async move {
                serve_embedded_file(tail.as_str()).await
            });

        // SPA 路由处理 - 对于不存在的路径返回 index.html
        let spa_route = warp::any()
            .and(warp::get())
            .and_then(|| async move {
                serve_embedded_file("index.html").await
            });

        // API 代理 - 转发到后端服务
        let api_proxy = warp::path("api")
            .and(warp::path::full())
            .and(warp::method())
            .and(warp::header::headers_cloned())
            .and(warp::body::bytes())
            .and_then(|path: warp::path::FullPath, method: warp::http::Method, headers: warp::http::HeaderMap, body: bytes::Bytes| async move {
                let backend_url = format!("http://127.0.0.1:23456{}", path.as_str());
                
                let client = reqwest::Client::new();
                let mut request = match method {
                    warp::http::Method::GET => client.get(&backend_url),
                    warp::http::Method::POST => client.post(&backend_url),
                    warp::http::Method::PUT => client.put(&backend_url),
                    warp::http::Method::DELETE => client.delete(&backend_url),
                    warp::http::Method::PATCH => client.patch(&backend_url),
                    _ => return Err(warp::reject::not_found()),
                };

                // 转发请求头（过滤一些不需要的）
                for (name, value) in headers.iter() {
                    let name_str = name.as_str();
                    if !["host", "connection", "content-length"].contains(&name_str) {
                        request = request.header(name, value);
                    }
                }

                // 添加请求体
                if !body.is_empty() {
                    request = request.body(body);
                }

                match request.send().await {
                    Ok(response) => {
                        let status = response.status();
                        let body = response.bytes().await.unwrap_or_default();
                        
                        // 简化响应处理，直接返回状态码和内容
                        Ok(warp::reply::with_status(
                            body.to_vec(),
                            warp::http::StatusCode::from_u16(status.as_u16()).unwrap_or(warp::http::StatusCode::INTERNAL_SERVER_ERROR)
                        ))
                    },
                    Err(_) => Err(warp::reject::not_found()),
                }
            });

        // WebSocket 代理
        let ws_proxy = warp::path("ws")
            .and(warp::ws())
            .map(|ws: warp::ws::Ws| {
                ws.on_upgrade(|_websocket| async {
                    // 实现 WebSocket 代理逻辑
                    // 这里可以转发到后端的 WebSocket 服务
                    println!("WebSocket connection established for WebUI");
                })
            });

        // 组合路由
        let routes = api_proxy
            .or(ws_proxy)
            .or(embedded_static)
            .or(spa_route)
            .with(warp::cors()
                .allow_any_origin()
                .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
                .allow_headers(vec!["content-type", "authorization"]));

        // 启动服务器
        let server = warp::serve(routes).run(addr);
        let handle = tokio::spawn(server);

        // 保存服务器句柄
        {
            let mut server_guard = self.server_handle.lock().await;
            *server_guard = Some(handle);
        }

        self.port = port;
        self.enabled = true;

        println!("✅ WebUI 服务器已启动在端口: {}", port);
        Ok(())
    }

    pub async fn stop_server(&mut self) {
        let mut server_guard = self.server_handle.lock().await;
        if let Some(handle) = server_guard.take() {
            handle.abort();
            println!("🛑 WebUI 服务器已停止");
        }
        self.enabled = false;
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn get_port(&self) -> u16 {
        self.port
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// WebUI Tauri 命令
#[tauri::command]
async fn start_webui_server(
    app_handle: tauri::AppHandle,
    port: u16,
) -> Result<String, String> {
    let webui_state = app_handle.state::<Arc<TokioMutex<WebuiServer>>>();
    let mut webui = webui_state.lock().await;
    
    // 始终使用内置资源服务
    println!("使用内置资源启动 WebUI 服务器");
    webui.start_server_prod(port).await?;
    
    Ok(format!("WebUI 服务器已启动在端口 {}", port))
}

#[tauri::command]
async fn stop_webui_server(
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let webui_state = app_handle.state::<Arc<TokioMutex<WebuiServer>>>();
    let mut webui = webui_state.lock().await;
    
    webui.stop_server().await;
    
    Ok("WebUI 服务器已停止".to_string())
}

#[tauri::command]
async fn get_webui_status(
    app_handle: tauri::AppHandle,
) -> Result<(bool, u16), String> {
    let webui_state = app_handle.state::<Arc<TokioMutex<WebuiServer>>>();
    let webui = webui_state.lock().await;
    
    Ok((webui.is_enabled(), webui.get_port()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())        .setup(|app| {
            // 初始化 WebUI 服务器状态
            let webui_server = Arc::new(TokioMutex::new(WebuiServer::new()));
            app.manage(webui_server);

            // 在 externalBin 配置下，Tauri 会处理不同平台的二进制文件
            // 开发模式和生产模式下都使用相同的逻辑
            let backend_exe = if cfg!(dev) {
                // 开发模式：直接使用 binaries 目录中的文件
                std::env::current_dir()
                    .unwrap()
                    .join("src-tauri")
                    .join("binaries")
                    .join("MaiLauncher-Backend-x86_64-pc-windows-msvc.exe")
            } else {
                // 生产模式：使用 Tauri 的资源解析
                // Tauri 会自动根据平台查找正确的二进制文件
                app.path()
                    .resolve("MaiLauncher-Backend", tauri::path::BaseDirectory::Resource)
                    .expect("无法找到后端二进制文件")
            };
            
            println!("🔍 尝试启动后端: {:?}", backend_exe);
            
            // 获取用户数据目录用于日志
            let logs_dir = app.path().app_data_dir()
                .expect("无法获取应用数据目录")
                .join("logs");
            
            // 确保日志目录存在
            std::fs::create_dir_all(&logs_dir).ok();
            
            // 启动Python进程（固定端口23456）并设置日志目录
            let backend_process = Command::new(&backend_exe)
                .env("LOGS_DIR", logs_dir.to_string_lossy().to_string())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .expect("启动后端失败");
            
            // 保存进程引用
            app.manage(BackendProcess(Mutex::new(Some(backend_process))));
            
            // 打印启动信息
            println!("✅ 后端进程已启动，端口:23456");
            
            Ok(())
        }).on_window_event(|app_handle, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // 应用关闭时结束后端进程
                let backend_state = app_handle.state::<BackendProcess>();
                let mut process_guard = backend_state.0.lock().unwrap();
                if let Some(mut process) = process_guard.take() {
                    let _ = process.kill();
                    println!("🛑 后端进程已终止");
                }
            }
        })        .invoke_handler(tauri::generate_handler![
            greet,
            start_webui_server,
            stop_webui_server,
            get_webui_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
