import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const result = await prisma.$transaction(async (tx) => {
    const active = await tx.rateLimitBucket.updateMany({
      where: { key, resetAt: { gt: now } },
      data: { count: { increment: 1 } },
    });
    if (active.count > 0) {
      const bucket = await tx.rateLimitBucket.findUniqueOrThrow({ where: { key } });
      return bucket.count;
    }
    const bucket = await tx.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return bucket.count;
  });
  return { allowed: result <= limit, remaining: Math.max(0, limit - result) };
}

/** Hash identities before persisting rate-limit keys so emails and IP addresses are not stored. */
export async function consumeIdentityRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
) {
  const secret = process.env.KIO_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("KIO_AUTH_SECRET is not configured.");
  const digest = createHmac("sha256", secret).update(scope + ":" + identity).digest("hex");
  return consumeRateLimit("identity:" + digest, limit, windowMs);
}

export function getClientRateLimitIdentity(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return (forwarded || realIp || "unknown").slice(0, 128);
}
