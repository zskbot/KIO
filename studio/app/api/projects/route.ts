import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(2000).default(""),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { files: true, artifacts: true } } },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid project details." }, { status: 400 });
  const slug = parsed.data.slug ?? parsed.data.name.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  if (!slug) return NextResponse.json({ error: "Project name must contain letters or numbers." }, { status: 400 });
  try {
    const project = await prisma.project.create({ data: { ...parsed.data, slug, userId: user.id } });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      return NextResponse.json({ error: "You already have a project with this slug." }, { status: 409 });
    return NextResponse.json({ error: "Could not create project." }, { status: 500 });
  }
}
