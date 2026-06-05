//! 实时 CPU 主频
//!
//! sysinfo 在 Windows 上 Cpu::frequency() 返回基频(不随负载/睿频变化),无法反映实时主频。
//! 改用 CallNtPowerInformation(ProcessorInformation) 读每个逻辑处理器的 CurrentMhz(实时,含睿频),
//! 取最大值作为"当前峰值主频"。非 Windows 暂返回 0,调用方回退静态基频(Linux 实时主频待远程支持时补)。

/// 当前峰值主频(MHz);取不到返回 0(调用方回退到静态基频)。
#[cfg(windows)]
pub fn current_max_mhz() -> u64 {
    use windows_sys::Win32::System::Power::{
        CallNtPowerInformation, ProcessorInformation, PROCESSOR_POWER_INFORMATION,
    };

    let n = std::thread::available_parallelism()
        .map(|v| v.get())
        .unwrap_or(1);
    let mut buf: Vec<PROCESSOR_POWER_INFORMATION> = vec![unsafe { std::mem::zeroed() }; n];

    // ProcessorInformation 按逻辑处理器填充 PROCESSOR_POWER_INFORMATION 数组;返回 STATUS_SUCCESS(0)即成功。
    let status = unsafe {
        CallNtPowerInformation(
            ProcessorInformation,
            std::ptr::null(),
            0,
            buf.as_mut_ptr().cast(),
            (n * std::mem::size_of::<PROCESSOR_POWER_INFORMATION>()) as u32,
        )
    };
    if status != 0 {
        return 0;
    }
    buf.iter().map(|p| p.CurrentMhz as u64).max().unwrap_or(0)
}

#[cfg(not(windows))]
pub fn current_max_mhz() -> u64 {
    0
}
