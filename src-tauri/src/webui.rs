use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
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
                content.data,
                "content-type",
                mime.as_ref(),
            ))
        }
        None => {
            // 如果文件不存在，返回 index.html (SPA 路由)
            match Assets::get("index.html") {
                Some(content) => Ok(warp::reply::with_header(
                    content.data,
                    "content-type",
                    "text/html",
                )),
                None => Err(warp::reject::not_found()),
            }
        }
    }
}

pub struct WebuiServer {
    server_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
    port: u16,
    enabled: bool,
}

impl WebuiServer {
    pub fn new() -> Self {
        Self {
            server_handle: Arc::new(Mutex::new(None)),
            port: 11111,
            enabled: false,
        }
    }    pub async fn start_server_dev(&mut self, port: u16, frontend_dist: PathBuf) -> Result<(), String> {
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

        self.setup_server_routes(addr, static_files, spa_route).await
    }    pub async fn start_server_prod(&mut self, port: u16, _app_handle: tauri::AppHandle) -> Result<(), String> {
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

        self.setup_server_routes(addr, embedded_static, spa_route).await
    }

    async fn setup_server_routes<S, P>(&mut self, addr: SocketAddr, static_files: S, spa_route: P) -> Result<(), String> 
    where 
        S: warp::Filter + Clone + Send + Sync + 'static,
        S::Extract: warp::Reply,
        P: warp::Filter + Clone + Send + Sync + 'static,
        P::Extract: warp::Reply,
    {        // API 代理 - 转发到后端服务
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
                ws.on_upgrade(|websocket| async {
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

// Tauri 命令
#[tauri::command]
pub async fn start_webui_server(
    app_handle: tauri::AppHandle,
    port: u16,
) -> Result<String, String> {
    let webui_state = app_handle.state::<Arc<Mutex<WebuiServer>>>();
    let mut webui = webui_state.lock().await;

    // 在开发模式下使用文件系统服务，生产模式下使用内置资源
    if cfg!(debug_assertions) {
        // 开发模式：尝试使用项目根目录下的 dist 文件夹
        let frontend_dist = std::env::current_dir()
            .map_err(|e| format!("无法获取当前目录: {}", e))?
            .parent() // 从 src-tauri 目录回到项目根目录
            .ok_or("无法获取父目录")?
            .join("dist");

        // 检查目录是否存在，如果不存在则使用内置资源
        if frontend_dist.exists() {
            println!("开发模式：使用文件系统 dist 目录: {:?}", frontend_dist);
            webui.start_server_dev(port, frontend_dist).await?;
        } else {
            println!("开发模式：dist 目录不存在，使用内置资源");
            webui.start_server_prod(port, app_handle.clone()).await?;
        }
    } else {
        // 生产模式：始终使用内置资源服务
        println!("生产模式：使用内置资源");
        webui.start_server_prod(port, app_handle.clone()).await?;
    }
    
    Ok(format!("WebUI 服务器已启动在端口 {}", port))
}

#[tauri::command]
pub async fn stop_webui_server(
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let webui_state = app_handle.state::<Arc<Mutex<WebuiServer>>>();
    let mut webui = webui_state.lock().await;
    
    webui.stop_server().await;
    
    Ok("WebUI 服务器已停止".to_string())
}

#[tauri::command]
pub async fn get_webui_status(
    app_handle: tauri::AppHandle,
) -> Result<(bool, u16), String> {
    let webui_state = app_handle.state::<Arc<Mutex<WebuiServer>>>();
    let webui = webui_state.lock().await;
    
    Ok((webui.is_enabled(), webui.get_port()))
}
