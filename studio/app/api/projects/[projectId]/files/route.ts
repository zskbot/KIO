import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string }> };
const fileSchema = z.object({
  path: z.string().min(1).max(240),
  content: z.string().max(1_000_000),
});
function validProjectPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return !normalized.startsWith("/") &&
    !normalized.split("/").some((part) => !part || part === "." || part === "..") &&
    !normalized.includes("\0") &&
    !/(^|\/)(\.env(?:\..*)?|\.git|node_modules|\.next)(\/|$)/i.test(normalized) &&
    !/(^|\/)(id_rsa|id_ed25519|credentials|secrets?)(\.|\/|$)/i.test(normalized);
}

export async function GET(_request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const files = await prisma.projectFile.findMany({
    where: { projectId }, orderBy: { path: "asc" },
    select: { id: true, path: true, size: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ files });
}

export async function POST(request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 1_100_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  const parsed = fileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validProjectPath(parsed.data.path))
    return NextResponse.json({ error: "Invalid file path or content." }, { status: 400 });
  const { projectId } = await context.params;
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const current = await prisma.projectFile.findUnique({ where: { projectId_path: { projectId, path: parsed.data.path } }, select: { id: true } });
  const count = await prisma.projectFile.count({ where: { projectId } });
  if (!current && count >= 200) return NextResponse.json({ error: "Project file limit reached (200)." }, { status: 409 });
  const data = { content: parsed.data.content, size: Buffer.byteLength(parsed.data.content, "utf8") };
  const file = current
    ? await prisma.projectFile.update({ where: { id: current.id }, data })
    : await prisma.projectFile.create({ data: { ...data, path: parsed.data.path, projectId } });
  return NextResponse.json({ file: { id: file.id, path: file.path, size: file.size, updatedAt: file.updatedAt } }, { status: current ? 200 : 201 });
}
