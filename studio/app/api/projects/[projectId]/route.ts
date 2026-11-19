import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(2000).optional(),
}).strict().refine((value) => value.name !== undefined || value.description !== undefined, {
  message: "Provide a project name or description.",
});

type RouteContext = { params: Promise<{ projectId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await context.params;
  const parsed = updateProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project details." }, { status: 400 });
  }

  const existing = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const updated = await prisma.project.updateMany({
    where: { id: projectId, userId: user.id },
    data: parsed.data,
  });
  if (updated.count !== 1) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: { _count: { select: { files: true, artifacts: true } } },
  });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  return NextResponse.json({ project });
}
