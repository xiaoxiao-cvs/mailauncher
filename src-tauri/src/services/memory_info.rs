//! 内存硬件信息(频率 / 类型)—— 经 SMBIOS Type 17 读取
//!
//! sysinfo 不提供内存频率与类型,这些是静态 SMBIOS/DMI 信息(开机后不变)。
//! Windows 下经 `GetSystemFirmwareTable('RSMB')` 取原始 SMBIOS 表,解析其中的
//! Type 17(Memory Device)结构,取已装填模块的频率与类型。非 Windows 暂无对应实现,返回未知。

/// 内存硬件信息:频率(MT/s)与类型(如 DDR5)。取不到时 speed=0、type_="未知"。
#[derive(Debug, Clone)]
pub struct MemoryHardware {
    /// 内存频率(MT/s);0 表示未知
    pub speed: u32,
    /// 内存类型(如 DDR5);未知为 "未知"
    pub type_: String,
}

impl MemoryHardware {
    fn unknown() -> Self {
        Self {
            speed: 0,
            type_: "未知".to_string(),
        }
    }
}

/// 读取本机内存硬件信息(频率与类型)。
#[cfg(windows)]
pub fn gather_memory_hardware() -> MemoryHardware {
    use windows_sys::Win32::System::SystemInformation::GetSystemFirmwareTable;

    // 'RSMB' 原始 SMBIOS 表提供者签名(0x52534D42)。
    let signature = u32::from_be_bytes([b'R', b'S', b'M', b'B']);

    unsafe {
        let size = GetSystemFirmwareTable(signature, 0, std::ptr::null_mut(), 0);
        if size == 0 {
            return MemoryHardware::unknown();
        }
        let mut buf = vec![0u8; size as usize];
        let written = GetSystemFirmwareTable(signature, 0, buf.as_mut_ptr().cast(), size);
        if written == 0 || written > size {
            return MemoryHardware::unknown();
        }
        buf.truncate(written as usize);
        parse_smbios(&buf)
    }
}

#[cfg(not(windows))]
pub fn gather_memory_hardware() -> MemoryHardware {
    MemoryHardware::unknown()
}

/// 解析 `GetSystemFirmwareTable('RSMB')` 返回的原始 SMBIOS 缓冲:遍历结构表,
/// 取 Type 17 中已装填内存模块的频率(优先 Configured Memory Speed)与类型。
#[cfg(windows)]
fn parse_smbios(raw: &[u8]) -> MemoryHardware {
    // RawSMBIOSData 头:Used20CallingMethod/u8 + Major/u8 + Minor/u8 + DmiRevision/u8 + Length/u32(LE)
    if raw.len() < 8 {
        return MemoryHardware::unknown();
    }
    let table_len = u32::from_le_bytes([raw[4], raw[5], raw[6], raw[7]]) as usize;
    let data = &raw[8..];
    let data = if table_len <= data.len() {
        &data[..table_len]
    } else {
        data
    };

    let mut best_speed: u32 = 0;
    let mut mem_type: Option<&'static str> = None;

    let mut off = 0usize;
    while off + 4 <= data.len() {
        let stype = data[off];
        let slen = data[off + 1] as usize; // 格式化区长度(含 4 字节头)
        if slen < 4 || off + slen > data.len() {
            break;
        }
        if stype == 127 {
            break; // End-of-Table
        }

        if stype == 17 {
            let f = &data[off..off + slen];
            // Size 字段(0x0C,WORD):0 = 空槽,0xFFFF = 未知,均跳过
            let size_field = read_u16(f, 0x0C);
            if size_field != 0 && size_field != 0xFFFF {
                // 频率优先取 Configured Memory Speed(0x20,SMBIOS 2.7+),否则取 Speed(0x15)
                let configured = read_u16(f, 0x20);
                let rated = read_u16(f, 0x15);
                let speed = if configured != 0 && configured != 0xFFFF {
                    u32::from(configured)
                } else if rated != 0 && rated != 0xFFFF {
                    u32::from(rated)
                } else {
                    0
                };
                best_speed = best_speed.max(speed);
                if mem_type.is_none() {
                    mem_type = map_memory_type(f.get(0x12).copied().unwrap_or(0));
                }
            }
        }

        // 跳过格式化区后的字符串集(以双 NUL 结尾),定位下一结构起点
        let mut p = off + slen;
        while p + 1 < data.len() {
            if data[p] == 0 && data[p + 1] == 0 {
                p += 2;
                break;
            }
            p += 1;
        }
        if p <= off {
            break; // 防御:无前进则停,避免死循环
        }
        off = p;
    }

    MemoryHardware {
        speed: best_speed,
        type_: mem_type.unwrap_or("未知").to_string(),
    }
}

/// 小端读 u16,越界返回 0(兼容旧 SMBIOS 较短的结构)。
#[cfg(windows)]
fn read_u16(buf: &[u8], off: usize) -> u16 {
    if off + 2 <= buf.len() {
        u16::from_le_bytes([buf[off], buf[off + 1]])
    } else {
        0
    }
}

/// SMBIOS Memory Type 枚举(Type 17 偏移 0x12)映射到常见 DDR 代次。
#[cfg(windows)]
fn map_memory_type(v: u8) -> Option<&'static str> {
    Some(match v {
        0x12 => "DDR",
        0x13 => "DDR2",
        0x18 => "DDR3",
        0x1A => "DDR4",
        0x1B => "LPDDR",
        0x1C => "LPDDR2",
        0x1D => "LPDDR3",
        0x1E => "LPDDR4",
        0x22 => "DDR5",
        0x23 => "LPDDR5",
        _ => return None,
    })
}
