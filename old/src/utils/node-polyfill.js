// 为浏览器环境提供 Node.js 全局变量
if (typeof window !== "undefined") {
  window.global = window;
  window.process = window.process || {
    env: { NODE_ENV: process.env.NODE_ENV },
    browser: true,
  };
}

export default function setupNodePolyfills() {
  console.log("Node.js polyfills initialized");
}
