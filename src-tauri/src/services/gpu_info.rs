//! 显卡信息检测
//!
//! sysinfo 不提供 GPU。Windows 下用 GDI 的 `EnumDisplayDevicesW` 枚举显示适配器名,
//! 去重并过滤软件/远程/镜像适配器(云服务器、RDP、无独显环境的回退,得到空列表)。
//! 非 Windows(及无显卡环境)返回空 Vec,调用方据此回退到只显示 CPU。

/// 已知 GPU 厂商/品牌关键字白名单:仅名称命中其一的适配器才算真实 GPU,
/// 据此屏蔽 GameViewer / Parsec / Spacedesk 等虚拟显示器(其名称不含 GPU 厂商)。
#[cfg(windows)]
const GPU_VENDORS: &[&str] = &[
    "nvidia", "geforce", "rtx", "gtx", "quadro", "tesla", "amd", "radeon", "instinct", "intel",
    "arc", "iris",
];

/// 枚举本机显卡名称列表。无独显/云服务器环境返回空 Vec(前端据此回退,不显示显卡行)。
#[cfg(windows)]
pub fn gather_gpus() -> Vec<String> {
    use windows_sys::Win32::Graphics::Gdi::{EnumDisplayDevicesW, DISPLAY_DEVICEW};

    let mut gpus: Vec<String> = Vec::new();
    let mut i = 0u32;
    loop {
        let mut dd: DISPLAY_DEVICEW = unsafe { std::mem::zeroed() };
        dd.cb = std::mem::size_of::<DISPLAY_DEVICEW>() as u32;
        // 第一参 null = 枚举显示适配器(GPU);iDevNum 递增直到返回 0
        let ok = unsafe { EnumDisplayDevicesW(std::ptr::null(), i, &mut dd, 0) };
        if ok == 0 {
            break;
        }
        i += 1;

        let name = utf16_buf_to_string(&dd.DeviceString);
        let name = name.trim();
        if name.is_empty() {
            continue;
        }
        // 只保留名称含已知 GPU 厂商关键字的真实适配器,并排除虚拟显示器
        // (GameViewer/Parsec/Spacedesk、Basic/Remote/Mirror、IDD 间接显示驱动等)。
        let lower = name.to_lowercase();
        let is_virtual = lower.contains("virtual")
            || lower.contains("remote")
            || lower.contains("mirror")
            || lower.contains("basic")
            || lower.contains("idd");
        let is_real_gpu = GPU_VENDORS.iter().any(|v| lower.contains(v));
        if is_virtual || !is_real_gpu {
            continue;
        }
        // 同一 GPU 驱动多显示器会重复出现,去重
        if !gpus.iter().any(|g| g == name) {
            gpus.push(name.to_string());
        }
    }
    gpus
}

#[cfg(not(windows))]
pub fn gather_gpus() -> Vec<String> {
    // 非 Windows 暂无检测;与云服务器无显卡同样作为 CPU-only 回退。
    Vec::new()
}

/// 把定长 UTF-16 缓冲(以 NUL 结尾)转成 String。
#[cfg(windows)]
fn utf16_buf_to_string(buf: &[u16]) -> String {
    let end = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..end])
}
