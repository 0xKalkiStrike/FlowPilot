import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { Spinner } from "../ui/Card.js";

export function AuthGuard() {
  const { user, status, fetchMe } = useAuthStore();

  useEffect(() => {
    if (status === "idle") fetchMe();
  }, [status, fetchMe]);

  if (status !== "ready") {
    return <div className="flex h-screen items-center justify-center"><Spinner className="h-6 w-6 text-brand-500" /></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
