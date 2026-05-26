import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { projectId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}
