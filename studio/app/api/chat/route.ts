import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { runKioAgent } from "@/lib/agent";
import { consumeIdentityRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const schema = z.object({
  message: z.string().trim().min(1).max(12000),
  conversationId: z.string().cuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to use persistent KIO sessions." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message must contain 1–12,000 characters." }, { status: 400 });

  try {
    const rate = await consumeIdentityRateLimit("chat-user", user.id, 20, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "KIO request limit reached. Please wait one minute before sending another message." }, { status: 429 });
    }

    const { message, conversationId } = parsed.data;
    let conversation = conversationId
      ? await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } })
      : null;
    if (!conversation) conversation = await prisma.conversation.create({ data: { title: message.slice(0, 72), userId: user.id } });

    const latest = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const history = latest.reverse().map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content,
    }));

    await prisma.message.create({ data: { role: "user", content: message, conversationId: conversation.id } });
    const result = await runKioAgent(message, history);
    await prisma.message.create({ data: { role: "assistant", content: result.content, conversationId: conversation.id } });
    return NextResponse.json({
      conversationId: conversation.id,
      message: result.content,
      skills: result.skills,
      providerConfigured: result.providerConfigured,
    });
  } catch (error) {
    console.error("KIO chat error", error);
    return NextResponse.json({ error: "KIO could not complete this request. Check the AI provider and server logs." }, { status: 502 });
  }
}
