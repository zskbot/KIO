import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string }> };
const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

export async function POST(_request: NextRequest, context: Context) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { files: { orderBy: { path: "asc" } } },
  });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (project.files.length === 0) return NextResponse.json({ error: "Add project files before packaging." }, { status: 400 });
  if (project.files.length > MAX_FILES) return NextResponse.json({ error: "Project exceeds the 200-file packer limit." }, { status: 413 });
  const totalBytes = project.files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) return NextResponse.json({ error: "Project exceeds the 10 MB source limit." }, { status: 413 });

  const zip = new JSZip();
  for (const file of project.files) zip.file(file.path, file.content, { date: file.updatedAt });
  zip.file("KIO-PACKAGE.json", JSON.stringify({
    format: "kio-package/v1",
    project: { id: project.id, name: project.name, slug: project.slug },
    createdAt: new Date().toISOString(),
    files: project.files.map(({ path, size }) => ({ path, size })),
  }, null, 2));
  const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const checksum = createHash("sha256").update(archive).digest("hex");
  const filename = project.slug + "-" + new Date().toISOString().replace(/[:.]/g, "-") + ".zip";
  const artifact = await prisma.artifact.create({
    data: {
      projectId, filename, mimeType: "application/zip",
      size: archive.byteLength, checksum, content: archive,
    },
    select: { id: true, filename: true, mimeType: true, size: true, checksum: true, createdAt: true },
  });
  return NextResponse.json({
    artifact: { ...artifact, downloadUrl: "/api/artifacts/" + artifact.id },
    sourceFiles: project.files.length,
  }, { status: 201 });
}
