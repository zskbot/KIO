import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string }> };
const MAX_FILE_BYTES = 1_000_000;
const MAX_PROJECT_BYTES = 10 * 1024 * 1024;
const fileSchema = z.object({
  path: z.string().trim().min(1).max(240),
  content: z.string().max(MAX_FILE_BYTES),
});

function validProjectPath(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return normalized === path &&
    !normalized.startsWith("/") &&
    !normalized.split("/").some((part) => !part || part === "." || part === "..") &&
    !/[\u0000-\u001f\u007f]/.test(normalized) &&
    !/(^|\/)(\.env(?:\..*)?|\.git|node_modules|\.next)(\/|$)/i.test(normalized) &&
    !/(^|\/)(id_rsa|id_ed25519|credentials|secrets?)(\.|\/|$)/i.test(normalized);
}

async function ownedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
}

export async function GET(request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  const project = await ownedProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const path = request.nextUrl.searchParams.get("path");
  if (path !== null) {
    if (!validProjectPath(path)) return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    const file = await prisma.projectFile.findUnique({
      where: { projectId_path: { projectId, path } },
      select: { id: true, path: true, content: true, size: true, updatedAt: true },
    });
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
    return NextResponse.json({ file });
  }

  const files = await prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { path: "asc" },
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
  const project = await ownedProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const size = Buffer.byteLength(parsed.data.content, "utf8");
  if (size > MAX_FILE_BYTES) return NextResponse.json({ error: "File exceeds the 1 MB limit." }, { status: 413 });

  const current = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path: parsed.data.path } },
    select: { id: true, size: true },
  });
  const [count, total] = await Promise.all([
    prisma.projectFile.count({ where: { projectId } }),
    prisma.projectFile.aggregate({ where: { projectId }, _sum: { size: true } }),
  ]);
  if (!current && count >= 200)
    return NextResponse.json({ error: "Project file limit reached (200)." }, { status: 409 });
  const nextTotal = (total._sum.size ?? 0) - (current?.size ?? 0) + size;
  if (nextTotal > MAX_PROJECT_BYTES)
    return NextResponse.json({ error: "Project source limit reached (10 MiB)." }, { status: 413 });

  const data = { content: parsed.data.content, size };
  const file = current
    ? await prisma.projectFile.update({ where: { id: current.id }, data })
    : await prisma.projectFile.create({ data: { ...data, path: parsed.data.path, projectId } });
  return NextResponse.json(
    { file: { id: file.id, path: file.path, size: file.size, updatedAt: file.updatedAt } },
    { status: current ? 200 : 201 },
  );
}

export async function PATCH(request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({
    fromPath: z.string().trim().min(1).max(240),
    toPath: z.string().trim().min(1).max(240),
  }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validProjectPath(parsed.data.fromPath) || !validProjectPath(parsed.data.toPath)) {
    return NextResponse.json({ error: "Invalid source or destination path." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const project = await ownedProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { fromPath, toPath } = parsed.data;
  const source = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path: fromPath } },
    select: { id: true, path: true, size: true, updatedAt: true },
  });
  if (!source) return NextResponse.json({ error: "Source file not found." }, { status: 404 });
  if (fromPath === toPath) return NextResponse.json({ file: source, renamed: false });

  const destination = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path: toPath } },
    select: { id: true },
  });
  if (destination) return NextResponse.json({ error: "A file already exists at the destination path." }, { status: 409 });

  try {
    const file = await prisma.projectFile.update({
      where: { id: source.id },
      data: { path: toPath },
      select: { id: true, path: true, size: true, updatedAt: true },
    });
    return NextResponse.json({ file, renamed: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A file already exists at the destination path." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  const project = await ownedProject(projectId, user.id);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const path = request.nextUrl.searchParams.get("path");
  if (!path || !validProjectPath(path))
    return NextResponse.json({ error: "A valid file path is required." }, { status: 400 });

  const file = await prisma.projectFile.findUnique({
    where: { projectId_path: { projectId, path } },
    select: { id: true },
  });
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  await prisma.projectFile.delete({ where: { id: file.id } });
  return NextResponse.json({ deleted: true, path });
}
