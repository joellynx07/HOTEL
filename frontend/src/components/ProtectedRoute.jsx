/**
 * src/components/ProtectedRoute.jsx
 * Client-side route guard. This is a UX convenience only — it decides
 * whether to render the page or bounce to sign-in — never a security
 * boundary on its own, since every real check happens server-side
 * (the httpOnly cookie + requireRole middleware on every API call).
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute({ role, children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-[13px] text-fg-subtle">Loading…</div>;
  }

  if (!user) {
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
