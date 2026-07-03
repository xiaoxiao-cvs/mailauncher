/// MaiBot data 存储分类统计与按类清理服务(G8-3)
///
/// 每个实例的 `MaiBot/data` 目录混放了不同用途的数据:主数据库(聊天记录/LLM 统计)、
/// 图片缓存、表情包缓存、长期记忆、插件数据、知识库嵌入等。本服务把它们按类别汇总占用,
/// 并允许单独清空"可再生的缓存类"(如图片/表情/临时文件),而对不可再生的核心数据
/// (数据库/记忆/知识库/WebUI 令牌)只展示占用、拒绝在此清理。
///
/// 类别定义严格对齐 MaiBot 真实 data 目录结构与官方一键包 `getMaiBotStorageStats`
/// (MaiBotOneKey/src/main/services/init-manager.ts)的分类口径,不臆造类别名。
use std::path::Path;

use chrono::Local;

use crate::errors::{AppError, AppResult};

/// 单个数据类别的静态定义。
///
/// `members` 是该类别在 `MaiBot/data` 下直接占用的子目录/文件名(精确匹配)。
/// `cleanable` 标记该类是否允许经 `clear_maibot_data_category` 删除——只有可再生的缓存
/// 才置 true,核心数据(数据库/记忆/知识库/WebUI 令牌)一律 false,避免误删不可恢复的数据。
struct CategoryDef {
    id: &'static str,
    display_name: &'static str,
    description: &'static str,
    cleanable: bool,
    members: &'static [&'static str],
}

/// data 目录类别表。名称与归属均来自 MaiBot 源码实际路径 + 官方一键包分类口径:
/// - database: src/common/database/database.py 的 `data/MaiBot.db`(含 SQLite -shm/-wal 辅助文件)
/// - images: src/chat/image_system/image_cache_cleanup.py 的 `data/images`
/// - emoji: src/emoji_system/emoji_manager.py 的 `data/emoji` + `data/emoji_thumbnails`
/// - memory: 官方一键包归类的 `data/a-memorix`(A-Memorix 长期记忆)
/// - plugins: `data/plugins`(插件运行时写入)
/// - prompts: src/common/prompt_i18n.py 的 `data/custom_prompts`
/// - embedding: src/chat/knowledge/embedding_store.py 的 `data/embedding`(+ 模型自检文件)
/// - webui: `data/webui.json` + `data/local_store.json`(含 WS 鉴权令牌,清空会掉登录态)
/// - temp: src/chat/utils/utils.py 的 `data/temp`(临时文件)
/// - html_imgs: src/maisaka/display/prompt_cli_renderer.py 的 `data/html_imgs`(渲染图缓存)
///
/// cleanable=true 仅授予可再生的缓存类(images/emoji/temp/html_imgs):MaiBot 会在下次运行时
/// 按需重建这些目录,删除不损失不可恢复的数据。数据库/记忆/知识库/插件数据/WebUI 令牌均不可清。
const CATEGORIES: &[CategoryDef] = &[
    CategoryDef {
        id: "database",
        display_name: "数据库",
        description: "MaiBot.db 及其 SQLite 辅助文件(聊天记录、LLM 统计等核心数据)。仅展示占用,不在此清理。",
        cleanable: false,
        members: &["MaiBot.db", "MaiBot.db-shm", "MaiBot.db-wal"],
    },
    CategoryDef {
        id: "images",
        display_name: "图片缓存",
        description: "聊天与消息图片文件缓存。可清理,MaiBot 会按需重建。",
        cleanable: true,
        members: &["images"],
    },
    CategoryDef {
        id: "emoji",
        display_name: "表情包缓存",
        description: "表情包文件与缩略图缓存。可清理,MaiBot 会重新扫描注册。",
        cleanable: true,
        members: &["emoji", "emoji_thumbnails"],
    },
    CategoryDef {
        id: "memory",
        display_name: "记忆数据",
        description: "A-Memorix 等长期记忆数据。仅展示占用,不在此清理。",
        cleanable: false,
        members: &["a-memorix"],
    },
    CategoryDef {
        id: "plugins",
        display_name: "插件数据",
        description: "插件运行时写入 data/plugins 的数据。仅展示占用,不在此清理。",
        cleanable: false,
        members: &["plugins"],
    },
    CategoryDef {
        id: "prompts",
        display_name: "自定义提示词",
        description: "Dashboard 保存的自定义 prompt 覆盖文件。仅展示占用,不在此清理。",
        cleanable: false,
        members: &["custom_prompts"],
    },
    CategoryDef {
        id: "embedding",
        display_name: "知识库嵌入",
        description: "知识库嵌入向量与模型自检数据。仅展示占用,不在此清理。",
        cleanable: false,
        members: &["embedding", "embedding_model_test.json"],
    },
    CategoryDef {
        id: "webui",
        display_name: "WebUI 偏好",
        description: "webui.json / local_store.json,含监控 WS 鉴权令牌。仅展示占用,清理会掉登录态,故不在此清理。",
        cleanable: false,
        members: &["webui.json", "local_store.json"],
    },
    CategoryDef {
        id: "temp",
        display_name: "临时文件",
        description: "data/temp 下的临时文件。可清理。",
        cleanable: true,
        members: &["temp"],
    },
    CategoryDef {
        id: "html_imgs",
        display_name: "渲染图缓存",
        description: "HTML 渲染生成的图片缓存。可清理。",
        cleanable: true,
        members: &["html_imgs"],
    },
];

/// "其他"类别的 id——凡不属于上表任何 members 的 data 目录项都归入此类(如知识库 graph/rag/
/// lpmm_storage 等)。因可能含知识库等不可恢复数据,该类不可清理。
const OTHER_ID: &str = "other";

/// 单个类别的统计结果(供前端展示)。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaiBotDataCategory {
    /// 类别 id(稳定标识,用于 clear_maibot_data_category 的 category 入参)
    pub id: String,
    /// 类别中文显示名
    pub display_name: String,
    /// 类别说明
    pub description: String,
    /// 是否允许经本服务清理(false 表示仅展示占用)
    pub cleanable: bool,
    /// 该类别占用字节数
    pub size_bytes: u64,
    /// 该类别包含的文件数(递归统计,不含目录本身)
    pub file_count: u64,
}

/// 一个实例 MaiBot/data 的分类统计快照。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaiBotDataStats {
    pub instance_id: String,
    /// MaiBot/data 绝对路径
    pub data_dir: String,
    /// data 目录是否存在(实例从未运行时可能不存在,此时各类别均为 0)
    pub data_dir_exists: bool,
    pub total_size_bytes: u64,
    pub total_file_count: u64,
    /// 扫描时刻(本地时间 ISO 字符串)
    pub scanned_at: String,
    pub categories: Vec<MaiBotDataCategory>,
}

/// 清理某类别的结果。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearDataResult {
    /// 被清理的类别 id
    pub category: String,
    /// 实际释放的字节数(删除前测得)
    pub removed_bytes: u64,
    /// 实际删除的顶层条目名(members 中真实存在并被删掉的)
    pub removed_entries: Vec<String>,
    /// 清理完成时刻(本地时间 ISO 字符串)
    pub cleared_at: String,
}

/// 递归测量路径的占用字节数与文件数。
///
/// 用 `symlink_metadata` 而非 `metadata`:遇到符号链接按链接本身计,不跟进目标,避免统计/后续
/// 清理越出 data 目录。单个条目 metadata 读取失败(如扫描中途被占用)按 0 计而不中断整体扫描——
/// 这是只读的尽力而为统计,不该因一个临时锁定的文件让整份占用报告失败。
fn measure_path(path: &Path) -> (u64, u64) {
    let meta = match std::fs::symlink_metadata(path) {
        Ok(m) => m,
        Err(_) => return (0, 0),
    };
    if meta.is_dir() {
        let mut size = 0u64;
        let mut count = 0u64;
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let (s, c) = measure_path(&entry.path());
                size += s;
                count += c;
            }
        }
        (size, count)
    } else {
        (meta.len(), 1)
    }
}

/// 扫描实例 `MaiBot/data` 目录,按类别汇总占用大小与文件数。
///
/// data 目录不存在(实例从未产生数据)时返回全 0 的类别列表而非报错;目录存在但读取失败
/// (如权限)则自然冒泡错误,不吞掉。
pub fn scan_data_stats(instance_id: &str, data_dir: &Path) -> AppResult<MaiBotDataStats> {
    let scanned_at = Local::now()
        .naive_local()
        .format("%Y-%m-%dT%H:%M:%S")
        .to_string();

    // 与 CATEGORIES 平行的 (size, count) 累加槽;other 单独累加
    let mut acc: Vec<(u64, u64)> = vec![(0, 0); CATEGORIES.len()];
    let mut other: (u64, u64) = (0, 0);

    let data_dir_exists = data_dir.exists();
    if data_dir_exists {
        let entries = std::fs::read_dir(data_dir)
            .map_err(|e| AppError::FileSystem(format!("读取 MaiBot/data 目录失败: {}", e)))?;
        for entry in entries {
            let entry =
                entry.map_err(|e| AppError::FileSystem(format!("遍历 data 目录失败: {}", e)))?;
            let name = entry.file_name().to_string_lossy().to_string();
            let (size, count) = measure_path(&entry.path());
            match CATEGORIES
                .iter()
                .position(|c| c.members.iter().any(|m| *m == name))
            {
                Some(idx) => {
                    acc[idx].0 += size;
                    acc[idx].1 += count;
                }
                None => {
                    other.0 += size;
                    other.1 += count;
                }
            }
        }
    }

    let mut categories: Vec<MaiBotDataCategory> = CATEGORIES
        .iter()
        .enumerate()
        .map(|(i, c)| MaiBotDataCategory {
            id: c.id.to_string(),
            display_name: c.display_name.to_string(),
            description: c.description.to_string(),
            cleanable: c.cleanable,
            size_bytes: acc[i].0,
            file_count: acc[i].1,
        })
        .collect();
    categories.push(MaiBotDataCategory {
        id: OTHER_ID.to_string(),
        display_name: "其他数据".to_string(),
        description: "未归类的 data 目录项(知识库 graph/rag、lpmm_storage 等)。含不可恢复数据,不在此清理。".to_string(),
        cleanable: false,
        size_bytes: other.0,
        file_count: other.1,
    });

    let total_size_bytes = categories.iter().map(|c| c.size_bytes).sum();
    let total_file_count = categories.iter().map(|c| c.file_count).sum();

    Ok(MaiBotDataStats {
        instance_id: instance_id.to_string(),
        data_dir: data_dir.display().to_string(),
        data_dir_exists,
        total_size_bytes,
        total_file_count,
        scanned_at,
        categories,
    })
}

/// 清空指定类别在 `MaiBot/data` 下的数据。
///
/// 三重防线,任一不满足即自然冒泡错误、不做任何删除:
/// 1. 类别必须是已知定义(未知 id 报 InvalidInput);
/// 2. 类别必须 cleanable(核心数据类拒绝清理);
/// 3. 实例必须已停止(`is_running` 为 true 时拒绝)——运行中的进程可能正持有文件句柄,
///    边跑边删会导致进程崩溃或数据损坏。
///
/// `is_running` 由命令层从 ProcessManager 求得后传入,使停机判定可在服务层单测覆盖。
/// 删除按类别 members 逐项进行,删除前先测得占用以回报释放字节;IO 失败自然冒泡。
pub fn clear_maibot_data_category(
    data_dir: &Path,
    category_id: &str,
    is_running: bool,
) -> AppResult<ClearDataResult> {
    let category = CATEGORIES
        .iter()
        .find(|c| c.id == category_id)
        .ok_or_else(|| AppError::InvalidInput(format!("未知的数据类别: {}", category_id)))?;

    if !category.cleanable {
        return Err(AppError::InvalidInput(format!(
            "数据类别「{}」不支持清理(仅展示占用)",
            category.display_name
        )));
    }

    if is_running {
        return Err(AppError::InvalidInput(
            "实例正在运行,请先停止实例后再清理数据".to_string(),
        ));
    }

    let mut removed_bytes = 0u64;
    let mut removed_entries: Vec<String> = Vec::new();
    for member in category.members {
        let path = data_dir.join(member);
        if !path.exists() {
            continue;
        }
        let (size, _) = measure_path(&path);
        if path.is_dir() {
            std::fs::remove_dir_all(&path)
                .map_err(|e| AppError::FileSystem(format!("删除 {:?} 失败: {}", path, e)))?;
        } else {
            std::fs::remove_file(&path)
                .map_err(|e| AppError::FileSystem(format!("删除 {:?} 失败: {}", path, e)))?;
        }
        removed_bytes += size;
        removed_entries.push((*member).to_string());
    }

    let cleared_at = Local::now()
        .naive_local()
        .format("%Y-%m-%dT%H:%M:%S")
        .to_string();

    Ok(ClearDataResult {
        category: category_id.to_string(),
        removed_bytes,
        removed_entries,
        cleared_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    /// 在 data 目录下写一个恰好 `size` 字节的文件(父目录按需创建)。
    fn write_file(data_dir: &Path, rel: &str, size: usize) {
        let path = data_dir.join(rel);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("创建父目录失败");
        }
        fs::write(&path, vec![0u8; size]).expect("写文件失败");
    }

    /// 构造一份含多类别真实条目的临时 data 目录,返回 (tempdir, data_dir)。
    fn setup_data_dir() -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let data_dir = dir.path().join("MaiBot").join("data");
        fs::create_dir_all(&data_dir).expect("创建 data 目录失败");

        // images: 150 字节 / 2 文件(含子目录)
        write_file(&data_dir, "images/a.png", 100);
        write_file(&data_dir, "images/sub/b.png", 50);
        // emoji 类别 = emoji + emoji_thumbnails: 50 字节 / 2 文件
        write_file(&data_dir, "emoji/e1.gif", 30);
        write_file(&data_dir, "emoji_thumbnails/t1.png", 20);
        // database: 200 字节 / 1 文件
        write_file(&data_dir, "MaiBot.db", 200);
        // prompts: 10 字节 / 1 文件
        write_file(&data_dir, "custom_prompts/p1.txt", 10);
        // temp: 5 字节 / 1 文件
        write_file(&data_dir, "temp/scratch.tmp", 5);
        // 未归类项 -> other: 77 字节 / 1 文件
        write_file(&data_dir, "mystery/x.bin", 77);

        (dir, data_dir)
    }

    fn category<'a>(stats: &'a MaiBotDataStats, id: &str) -> &'a MaiBotDataCategory {
        stats
            .categories
            .iter()
            .find(|c| c.id == id)
            .unwrap_or_else(|| panic!("缺少类别 {}", id))
    }

    #[test]
    fn scan_classifies_sizes_and_counts_by_category() {
        let (_guard, data_dir) = setup_data_dir();
        let stats = scan_data_stats("inst-1", &data_dir).expect("扫描失败");

        assert!(stats.data_dir_exists);
        assert_eq!(stats.instance_id, "inst-1");

        let images = category(&stats, "images");
        assert_eq!(images.size_bytes, 150, "images 应含子目录内文件");
        assert_eq!(images.file_count, 2);
        assert!(images.cleanable);

        let emoji = category(&stats, "emoji");
        assert_eq!(emoji.size_bytes, 50, "emoji 应合并 emoji + emoji_thumbnails");
        assert_eq!(emoji.file_count, 2);

        let database = category(&stats, "database");
        assert_eq!(database.size_bytes, 200);
        assert_eq!(database.file_count, 1);
        assert!(!database.cleanable, "数据库类别不可清理");

        let prompts = category(&stats, "prompts");
        assert_eq!(prompts.size_bytes, 10);

        let temp = category(&stats, "temp");
        assert_eq!(temp.size_bytes, 5);
        assert!(temp.cleanable);

        let other = category(&stats, "other");
        assert_eq!(other.size_bytes, 77, "未归类项应落入 other");
        assert_eq!(other.file_count, 1);
        assert!(!other.cleanable);

        // 总量 = 150 + 50 + 200 + 10 + 5 + 77
        assert_eq!(stats.total_size_bytes, 492);
        assert_eq!(stats.total_file_count, 8);
    }

    #[test]
    fn scan_returns_zeros_when_data_dir_absent() {
        let dir = tempfile::tempdir().expect("创建临时目录失败");
        let data_dir = dir.path().join("MaiBot").join("data"); // 不创建
        let stats = scan_data_stats("inst-x", &data_dir).expect("目录缺失不应报错");

        assert!(!stats.data_dir_exists);
        assert_eq!(stats.total_size_bytes, 0);
        assert_eq!(stats.total_file_count, 0);
        // 类别列表仍完整(含 other),全为 0,供前端稳定渲染
        assert!(stats.categories.iter().any(|c| c.id == "images"));
        assert!(stats.categories.iter().all(|c| c.size_bytes == 0));
    }

    #[test]
    fn clear_removes_only_target_category() {
        let (_guard, data_dir) = setup_data_dir();

        let result = clear_maibot_data_category(&data_dir, "images", false).expect("清理 images 失败");

        assert_eq!(result.category, "images");
        assert_eq!(result.removed_bytes, 150, "释放字节应等于 images 占用");
        assert_eq!(result.removed_entries, vec!["images".to_string()]);

        // 只删 images:emoji / 数据库 / temp / other 均应保留
        assert!(!data_dir.join("images").exists(), "images 应已删除");
        assert!(data_dir.join("emoji/e1.gif").exists(), "emoji 不应被动到");
        assert!(data_dir.join("MaiBot.db").exists(), "数据库不应被动到");
        assert!(data_dir.join("temp/scratch.tmp").exists(), "temp 不应被动到");
        assert!(data_dir.join("mystery/x.bin").exists(), "other 不应被动到");

        // 清理后再扫描,images 归零,其余不变
        let stats = scan_data_stats("inst-1", &data_dir).expect("扫描失败");
        assert_eq!(category(&stats, "images").size_bytes, 0);
        assert_eq!(category(&stats, "emoji").size_bytes, 50);
        assert_eq!(category(&stats, "database").size_bytes, 200);
    }

    #[test]
    fn clear_merges_multi_member_category() {
        let (_guard, data_dir) = setup_data_dir();

        let result = clear_maibot_data_category(&data_dir, "emoji", false).expect("清理 emoji 失败");

        assert_eq!(result.removed_bytes, 50);
        // members 中真实存在的两项都应被删并记录
        assert!(result.removed_entries.contains(&"emoji".to_string()));
        assert!(result.removed_entries.contains(&"emoji_thumbnails".to_string()));
        assert!(!data_dir.join("emoji").exists());
        assert!(!data_dir.join("emoji_thumbnails").exists());
    }

    #[test]
    fn clear_rejects_running_instance_without_deleting() {
        let (_guard, data_dir) = setup_data_dir();

        let err = clear_maibot_data_category(&data_dir, "images", true)
            .expect_err("运行中实例应拒绝清理");
        assert!(matches!(err, AppError::InvalidInput(_)));

        // 拒绝后不得有任何删除
        assert!(data_dir.join("images/a.png").exists(), "被拒后 images 必须原样保留");
    }

    #[test]
    fn clear_rejects_non_cleanable_category() {
        let (_guard, data_dir) = setup_data_dir();

        let err = clear_maibot_data_category(&data_dir, "database", false)
            .expect_err("数据库类别应拒绝清理");
        assert!(matches!(err, AppError::InvalidInput(_)));
        assert!(data_dir.join("MaiBot.db").exists(), "数据库必须原样保留");
    }

    #[test]
    fn clear_rejects_unknown_category() {
        let (_guard, data_dir) = setup_data_dir();

        let err = clear_maibot_data_category(&data_dir, "nope", false)
            .expect_err("未知类别应报错");
        assert!(matches!(err, AppError::InvalidInput(_)));
    }
}
