"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, LockKeyhole } from "lucide-react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to reset password.");
      setMessage(data.message || "Password updated. Please sign in.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-shell">
    <Link href="/login" className="auth-back"><ArrowLeft size={15} />Back to sign in</Link>
    <form className="auth-card" onSubmit={submit}>
      <div className="brand auth-brand"><span className="brand-symbol"><i /><i /></span><span>KIO<span className="brand-dot">.AI</span></span></div>
      <div className="eyebrow">ACCOUNT RECOVERY</div>
      <h1>Choose a new password</h1>
      <p>Use at least 10 characters. Reset links expire after 30 minutes.</p>
      <label>New password</label>
      <div className="auth-input"><LockKeyhole size={16} /><input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /></div>
      {error ? <div className="form-error">{error}</div> : null}
      {message ? <div role="status" className="form-notice">{message}</div> : null}
      <button className="button button-light auth-submit" disabled={busy || !token || Boolean(message)}>{busy ? <LoaderCircle className="spin" size={16} /> : null}Update password</button>
      {!token ? <div className="form-error">The reset token is missing. Request a new link.</div> : null}
      <div className="auth-switch"><Link href="/forgot-password">Request another reset link</Link></div>
    </form>
  </main>;
}
