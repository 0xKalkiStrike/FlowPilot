import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav.js";
import { Toaster } from "../ui/Toaster.js";

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

export function BuilderLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Outlet />
      <Toaster />
    </div>
  );
}
