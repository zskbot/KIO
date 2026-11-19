import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { hashOpaqueToken } from "@/lib/auth-tokens";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const schema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(10).max(128),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request. Passwords must be 10–128 characters." }, { status: 400 });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const tokenHash = hashOpaqueToken(parsed.data.token);
  const now = new Date();
  try {
    const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt <= now) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, id: { not: token.id }, usedAt: null },
        data: { usedAt: now },
      });
    });
    return NextResponse.json({ message: "Password updated. Please sign in again." });
  } catch {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }
}
