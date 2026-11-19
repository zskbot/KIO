"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Check your inbox for a verification link.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    let active = true;
    fetch("/api/auth/verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      if (active) setMessage(data.message || "Email verified successfully.");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Verification failed.");
    });
    return () => { active = false; };
  }, []);
  async function resend() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verification/request", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send verification email.");
      setMessage(data.message || "Verification email sent.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send verification email.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-shell">
    <Link href="/" className="auth-back"><ArrowLeft size={15} />Back to workspace</Link>
    <section className="auth-card">
      <div className="brand auth-brand"><span className="brand-symbol"><i /><i /></span><span>KIO<span className="brand-dot">.AI</span></span></div>
      <div className="eyebrow">EMAIL VERIFICATION</div>
      <h1>Verify your email</h1>
      <p>Confirm your email address to help protect your KIO account.</p>
      <MailCheck size={30} />
      {message ? <div role="status" className="form-notice">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <button className="button button-light auth-submit" onClick={resend} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}Send verification email</button>
      <div className="auth-switch"><Link href="/">Continue to workspace</Link></div>
    </section>
  </main>;
}
