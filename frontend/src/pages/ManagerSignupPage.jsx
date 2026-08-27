import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function ManagerSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/api/auth/signup", { fullName, email, password });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="mb-2 text-[20px] font-medium text-fg">Check your inbox</h1>
        <p className="text-[13px] text-fg-muted">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your account, then sign in.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-[22px] font-medium tracking-tight text-fg">List your property</h1>
      <p className="mb-6 text-[13px] text-fg-muted">Create your manager account to get started.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-md border border-border-strong bg-bg px-3 py-2.5 text-[13px] text-fg outline-none focus:border-accent"
        />
        <input
          type="email"
          required
          placeholder="Business email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-border-strong bg-bg px-3 py-2.5 text-[13px] text-fg outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          minLength={10}
          placeholder="Password (10+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-border-strong bg-bg px-3 py-2.5 text-[13px] text-fg outline-none focus:border-accent"
        />
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-accent px-4 py-2.5 text-[14px] font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-[13px] text-fg-muted">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </main>
  );
}
