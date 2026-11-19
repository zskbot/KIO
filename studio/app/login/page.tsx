"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign in failed.");
      window.location.href = "/";
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-shell">
    <Link href="/" className="auth-back"><ArrowLeft size={15} />Back to workspace</Link>
    <form className="auth-card" onSubmit={submit}>
      <div className="brand auth-brand"><span className="brand-symbol"><i /><i /></span><span>KIO<span className="brand-dot">.AI</span></span></div>
      <div className="eyebrow">WELCOME BACK</div>
      <h1>Sign in to KIO</h1>
      <p>Continue building with your AI engineering workspace.</p>
      <label>Email address</label>
      <div className="auth-input"><Mail size={16} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
      <label>Password</label>
      <div className="auth-input"><LockKeyhole size={16} /><input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" /></div>
      <div className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></div>
      {error ? <div className="form-error">{error}</div> : null}
      <button className="button button-light auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}Sign in</button>
      <div className="auth-switch">New to KIO? <Link href="/register">Create an account</Link></div>
    </form>
  </main>;
}
