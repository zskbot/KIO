import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let databaseStatus: "connected" | "unavailable" | "not-configured" = "not-configured";
  if (databaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = "connected";
    } catch {
      databaseStatus = "unavailable";
    }
  }
  const aiProviderConfigured = Boolean(process.env.KIO_LLM_API_KEY);
  const emailProviderConfigured = Boolean(process.env.RESEND_API_KEY && process.env.KIO_EMAIL_FROM && process.env.KIO_APP_URL);
  const authSecretConfigured = Boolean(process.env.KIO_AUTH_SECRET && process.env.KIO_AUTH_SECRET.length >= 32);
  const ready = databaseStatus === "connected" && aiProviderConfigured && authSecretConfigured;
  return NextResponse.json({
    service: "kio-studio",
    status: ready ? "ok" : "degraded",
    version: "0.3.0",
    databaseConfigured,
    databaseStatus,
    aiProviderConfigured,
    emailProviderConfigured,
    authSecretConfigured,
  }, { status: ready ? 200 : 503 });
}
