"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message || "If an account matches that email, instructions will be sent.");
    } catch {
      setMessage("Unable to submit the request. Please try again later.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-shell">
    <Link href="/login" className="auth-back"><ArrowLeft size={15} />Back to sign in</Link>
    <form className="auth-card" onSubmit={submit}>
      <div className="brand auth-brand"><span className="brand-symbol"><i /><i /></span><span>KIO<span className="brand-dot">.AI</span></span></div>
      <div className="eyebrow">ACCOUNT RECOVERY</div>
      <h1>Reset your password</h1>
      <p>Enter the email address associated with your KIO account.</p>
      <label>Email address</label>
      <div className="auth-input"><Mail size={16} /><input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
      {message ? <div role="status" className="form-notice">{message}</div> : null}
      <button className="button button-light auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}Send reset instructions</button>
      <div className="auth-switch"><Link href="/login">Return to sign in</Link></div>
    </form>
  </main>;
}
