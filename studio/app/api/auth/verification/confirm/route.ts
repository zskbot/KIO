import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashOpaqueToken } from "@/lib/auth-tokens";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const schema = z.object({ token: z.string().min(32).max(200) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 });
  const tokenHash = hashOpaqueToken(parsed.data.token);
  const now = new Date();
  try {
    const token = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt <= now) return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await tx.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: now } });
      await tx.emailVerificationToken.updateMany({
        where: { userId: token.userId, id: { not: token.id }, usedAt: null },
        data: { usedAt: now },
      });
    });
    return NextResponse.json({ message: "Email verified successfully." });
  } catch {
    return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 });
  }
}
