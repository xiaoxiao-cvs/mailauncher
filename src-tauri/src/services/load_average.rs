//! 跨平台系统平均负载采样
//!
//! Windows 无原生 load average:周期采样性能计数器 `\System\Processor Queue Length`
//! (等待 CPU 的线程数 = 运行队列长度),按 Unix 同款指数衰减移动平均算 1/5/15 分钟负载。
//! Unix 直接用 sysinfo 的原生 load_average。
//!
//! 公式:L_m(t) = L_m(t-1)·e^(-Δt/60m) + q(t)·(1 - e^(-Δt/60m))
//! q(t)=运行队列长度,m=窗口分钟数,Δt=采样间隔秒。

#[cfg(windows)]
pub use windows_impl::LoadSampler;

#[cfg(not(windows))]
pub use unix_impl::LoadSampler;

#[cfg(windows)]
mod windows_impl {
    use std::ptr;

    use windows_sys::Win32::System::Performance::{
        PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData, PdhGetFormattedCounterValue,
        PdhOpenQueryW, PDH_FMT_COUNTERVALUE, PDH_FMT_LONG,
    };

    /// 持久 PDH 查询句柄 + 3 个窗口的 EWMA 状态。
    pub struct LoadSampler {
        query: isize,
        counter: isize,
        ready: bool,
        seeded: bool,
        l1: f64,
        l5: f64,
        l15: f64,
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn ewma(prev: f64, sample: f64, elapsed_secs: f64, minutes: f64) -> f64 {
        let decay = (-elapsed_secs / (60.0 * minutes)).exp();
        prev * decay + sample * (1.0 - decay)
    }

    impl LoadSampler {
        pub fn new() -> Self {
            let mut query: isize = 0;
            let mut counter: isize = 0;
            let mut ready = false;
            // SAFETY: 标准 PDH 调用序列;任一步失败则 ready=false,后续采样直接返回当前 EWMA(初始 0)。
            unsafe {
                if PdhOpenQueryW(ptr::null(), 0, &mut query) == 0 {
                    let path = wide("\\System\\Processor Queue Length");
                    if PdhAddEnglishCounterW(query, path.as_ptr(), 0, &mut counter) == 0 {
                        let _ = PdhCollectQueryData(query); // 首次采集建立基线
                        ready = true;
                    }
                }
            }
            Self {
                query,
                counter,
                ready,
                seeded: false,
                l1: 0.0,
                l5: 0.0,
                l15: 0.0,
            }
        }

        fn read_queue(&self) -> Option<f64> {
            if !self.ready {
                return None;
            }
            // SAFETY: query/counter 在 new 中成功创建;按 PDH_FMT_LONG 读联合体的 longValue 字段。
            unsafe {
                if PdhCollectQueryData(self.query) != 0 {
                    return None;
                }
                let mut value: PDH_FMT_COUNTERVALUE = std::mem::zeroed();
                if PdhGetFormattedCounterValue(
                    self.counter,
                    PDH_FMT_LONG,
                    ptr::null_mut(),
                    &mut value,
                ) != 0
                {
                    return None;
                }
                Some(value.Anonymous.longValue as f64)
            }
        }

        /// 更新 3 个窗口的 EWMA 并返回 (1min, 5min, 15min) 负载。
        ///
        /// 活跃线程 active = cpu_running(当前运行,由 CPU 占用比×核数估算)+ 运行队列长度(等待),
        /// 与 Windows 任务管理器"平均负载"口径一致(高核数空闲机器上队列≈0,负载主要由运行部分贡献)。
        /// PDH 读取失败时队列按 0 计,负载仍反映 CPU 运行部分。首次采样直接以 active 播种,避免从 0 缓慢爬升。
        pub fn sample(&mut self, elapsed_secs: f64, cpu_running: f64) -> (f64, f64, f64) {
            let queue = self.read_queue().unwrap_or(0.0);
            let active = cpu_running + queue;
            if !self.seeded {
                self.l1 = active;
                self.l5 = active;
                self.l15 = active;
                self.seeded = true;
            } else if elapsed_secs > 0.0 {
                self.l1 = ewma(self.l1, active, elapsed_secs, 1.0);
                self.l5 = ewma(self.l5, active, elapsed_secs, 5.0);
                self.l15 = ewma(self.l15, active, elapsed_secs, 15.0);
            }
            (self.l1, self.l5, self.l15)
        }
    }

    impl Default for LoadSampler {
        fn default() -> Self {
            Self::new()
        }
    }

    impl Drop for LoadSampler {
        fn drop(&mut self) {
            if self.ready {
                // SAFETY: query 在 new 中成功创建。
                unsafe {
                    let _ = PdhCloseQuery(self.query);
                }
            }
        }
    }
}

#[cfg(not(windows))]
mod unix_impl {
    /// Unix 直接用 sysinfo 原生负载,无需自维护 EWMA 状态。
    pub struct LoadSampler;

    impl LoadSampler {
        pub fn new() -> Self {
            Self
        }

        pub fn sample(&mut self, _elapsed_secs: f64, _cpu_running: f64) -> (f64, f64, f64) {
            let la = sysinfo::System::load_average();
            (la.one, la.five, la.fifteen)
        }
    }

    impl Default for LoadSampler {
        fn default() -> Self {
            Self::new()
        }
    }
}
