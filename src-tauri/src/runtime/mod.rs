pub mod adapter;
pub mod local;
pub mod resolver;
pub mod wsl;

pub use adapter::{DiscoveredRuntimeProcess, ResolvedCommand, RuntimeAdapter};
pub use local::LocalRuntimeAdapter;
pub use resolver::RuntimeResolver;
pub use wsl::Wsl2RuntimeAdapter;