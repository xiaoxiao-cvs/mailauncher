pub mod adapter;
pub mod docker;
pub mod local;
pub mod resolver;
pub mod wsl;

pub use adapter::{DiscoveredRuntimeProcess, ResolvedCommand, RuntimeAdapter, TerminalSessionInfo};
pub use docker::DockerRuntimeAdapter;
pub use local::LocalRuntimeAdapter;
pub use resolver::RuntimeResolver;
pub use wsl::Wsl2RuntimeAdapter;