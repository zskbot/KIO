import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createOpaqueToken } from "@/lib/auth-tokens";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendAuthEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keySecret = process.env.KIO_AUTH_SECRET;
  if (!keySecret || keySecret.length < 32) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  const key = createHmac("sha256", keySecret).update(`verify:${user.id}`).digest("hex");
  const rate = await consumeRateLimit(`auth:verify:${key}`, 3, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Please wait before requesting another verification email." }, { status: 429 });
  if (user.email) {
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } });
    if (account?.emailVerifiedAt) return NextResponse.json({ message: "Email is already verified." });
  }
  const { token, tokenHash } = createOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  });
  const sent = await sendAuthEmail({ to: user.email, token, kind: "verify" });
  if (!sent) return NextResponse.json({ error: "Email delivery is not configured. Set RESEND_API_KEY, KIO_EMAIL_FROM and KIO_APP_URL." }, { status: 503 });
  return NextResponse.json({ message: "Verification email sent." });
}
