import { UserConfigExport } from "vite"; // 从 'vite' 导入 UserConfigExport 而不是 UserConfig

// 将类型声明更改为 UserConfigExport，以允许配置是一个函数
declare const config: UserConfigExport;
export default config;
