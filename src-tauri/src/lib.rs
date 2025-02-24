use tauri_plugin_http::reqwest::Client;
use tauri::command;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// 定义请求参数结构体
#[derive(Serialize, Deserialize)]
struct RequestOptions {
    method: String, // HTTP方法，如 "GET", "POST", "PUT" 等
    url: String,    // 请求的URL
    verify: Option<bool>, //https校验是否验证
    headers: Option<HashMap<String, String>>, // 可选的请求头
    body: Option<String>, // 可选的请求体（JSON字符串）
}

// 定义响应结构体
#[derive(Serialize, Deserialize)]
struct ApiResponse {
    status: u16,      // 响应状态码
    body: String,     // 响应体
    headers: HashMap<String, String>, // 响应头
}

// 通用的底层方法
#[command]
async fn make_request(options: RequestOptions) -> Result<ApiResponse, String> {
    //是否https校验，默认验证
    let verify = options.verify.unwrap_or(true);

    // 创建一个reqwest客户端，并禁用证书验证
    let client = Client::builder()
        .danger_accept_invalid_certs(!verify) // 禁用证书验证
        .build()
        .map_err(|e| e.to_string())?; // 处理客户端创建错误

    // 根据传入的HTTP方法创建请求
    let method = match options.method.to_uppercase().as_str() {
        "GET" => client.get(&options.url),
        "POST" => client.post(&options.url),
        "PUT" => client.put(&options.url),
        "DELETE" => client.delete(&options.url),
        "PATCH" => client.patch(&options.url),
        _ => return Err("不支持的HTTP方法".to_string()),
    };

    // 添加请求头
    let mut request = method;

    // 如果请求头未指定Content-Type，则添加默认的Content-Type
    let mut headers = options.headers.unwrap_or_default();
    if !headers.contains_key("Content-Type") && options.body.is_some() {
        headers.insert("Content-Type".to_string(), "application/json".to_string());
    }

    // 添加请求头
    for (key, value) in headers {
        request = request.header(&key, &value);
    }

    // 添加请求体（如果存在）
    if let Some(body) = options.body {
        request = request.body(body);
    }

    // 发送请求
    let response = request
        .send()
        .await
        .map_err(|e| e.to_string())?; // 处理请求发送错误

    // 获取响应状态码
    let status = response.status().as_u16();

    // 获取响应头
    let headers = response
        .headers()
        .iter()
        .map(|(key, value)| {
            (
                key.to_string(),
                value.to_str().unwrap_or("").to_string(),
            )
        })
        .collect();

    // 获取响应体
    let body = response
        .text()
        .await
        .map_err(|e| e.to_string())?; // 处理响应体读取错误

    // 返回响应数据
    Ok(ApiResponse { status, body, headers })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![make_request]) // 注册命令
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
