"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed.");
      window.location.href = data.verificationEmailSent ? "/verify-email" : "/verify-email?delivery=unavailable";
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-shell">
    <Link href="/" className="auth-back"><ArrowLeft size={15} />Back to workspace</Link>
    <form className="auth-card" onSubmit={submit}>
      <div className="brand auth-brand"><span className="brand-symbol"><i /><i /></span><span>KIO<span className="brand-dot">.AI</span></span></div>
      <div className="eyebrow">START BUILDING</div>
      <h1>Create your account</h1>
      <p>One workspace for your product and engineering flow.</p>
      <label>Full name</label>
      <div className="auth-input"><UserRound size={16} /><input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></div>
      <label>Email address</label>
      <div className="auth-input"><Mail size={16} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
      <label>Password</label>
      <div className="auth-input"><LockKeyhole size={16} /><input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /></div>
      {error ? <div className="form-error">{error}</div> : null}
      <button className="button button-light auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}Create account</button>
      <div className="auth-switch">Already registered? <Link href="/login">Sign in</Link></div>
    </form>
  </main>;
}
