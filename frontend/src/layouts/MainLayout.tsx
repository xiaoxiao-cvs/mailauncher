import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";

export function MainLayout() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: "var(--ls-bg)" }}
    >
      {/* 浮岛坞:自带预留列宽与定位(垂直居中、上下露底),故直接作为 flex 子项 */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="scrollbar-thin flex-1 overflow-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
