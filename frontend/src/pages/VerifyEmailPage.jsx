import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error"

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    api
      .post("/api/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 text-center">
      {status === "verifying" && <p className="text-[13px] text-fg-muted">Verifying your email…</p>}
      {status === "success" && (
        <>
          <h1 className="mb-2 text-[20px] font-medium text-fg">Email verified</h1>
          <p className="mb-4 text-[13px] text-fg-muted">You can now sign in and finish listing your property.</p>
          <Link to="/sign-in" className="rounded-md bg-accent px-4 py-2.5 text-[13px] font-medium text-accent-fg hover:opacity-90">
            Sign in
          </Link>
        </>
      )}
      {status === "error" && (
        <p className="text-[13px] text-red-600">This verification link is invalid or has expired.</p>
      )}
    </main>
  );
}
