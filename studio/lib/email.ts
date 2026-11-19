type AuthEmailKind = "verify" | "reset";

export async function sendAuthEmail(input: {
  to: string;
  token: string;
  kind: AuthEmailKind;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.KIO_EMAIL_FROM;
  const appUrl = process.env.KIO_APP_URL;
  if (!apiKey || !from || !appUrl) return false;

  let origin: URL;
  try {
    origin = new URL(appUrl);
    if (origin.protocol !== "https:" && process.env.NODE_ENV === "production") return false;
  } catch {
    return false;
  }

  const path = input.kind === "verify" ? "/verify-email" : "/reset-password";
  const action = input.kind === "verify" ? "verify your email address" : "reset your password";
  const link = new URL(path, origin);
  link.searchParams.set("token", input.token);
  const subject = input.kind === "verify" ? "Verify your KIO.AI email" : "Reset your KIO.AI password";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text: `Use this link to ${action}: ${link.toString()}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
    }),
    cache: "no-store",
  });
  return response.ok;
}
