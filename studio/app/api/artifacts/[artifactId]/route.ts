import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ artifactId: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { artifactId } = await context.params;
  const artifact = await prisma.artifact.findFirst({
    where: { id: artifactId, project: { userId: user.id } },
  });
  if (!artifact) return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  return new NextResponse(artifact.content, {
    headers: {
      "Content-Type": artifact.mimeType,
      "Content-Length": String(artifact.size),
      "Content-Disposition": 'attachment; filename="' + artifact.filename.replace(/["\\\r\n]/g, "_") + '"',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "ETag": '"' + artifact.checksum + '"',
    },
  });
}
