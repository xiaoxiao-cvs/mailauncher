import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar";

export function MainLayout() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: "var(--ls-bg)" }}
    >
      {/* Sidebar Container - Floating with padding */}
      <div className="h-full flex-shrink-0 p-4 pr-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="scrollbar-thin flex-1 overflow-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
