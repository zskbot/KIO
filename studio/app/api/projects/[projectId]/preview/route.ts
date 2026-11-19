import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string }> };

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function withPreviewPolicy(source: string) {
  const policy = '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">';
  if (/<head[^>]*>/i.test(source)) {
    return source.replace(/<head[^>]*>/i, (head) => head + policy);
  }
  return "<!doctype html><html><head>" + policy + "</head><body>" + source + "</body></html>";
}

export async function GET(_request: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const entry = await prisma.projectFile.findFirst({
    where: { projectId, path: { in: ["index.html", "public/index.html"] } },
    orderBy: { path: "asc" },
    select: { path: true, content: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Preview requires an index.html or public/index.html file." }, { status: 404 });
  }

  return NextResponse.json({
    entry: entry.path,
    html: withPreviewPolicy(entry.content),
    isolation: "sandboxed-iframe",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
