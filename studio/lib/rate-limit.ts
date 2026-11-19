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
