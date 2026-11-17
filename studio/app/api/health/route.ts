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
  const ready = databaseStatus === "connected" && aiProviderConfigured;

  return NextResponse.json(
    {
      service: "kio-studio",
      status: ready ? "ok" : "degraded",
      version: "0.1.0",
      aiProviderConfigured,
      databaseConfigured,
      databaseStatus,
    },
    { status: ready ? 200 : 503 }
  );
}
