import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { videoRenderQueue } from "@/lib/queue";

type RouteContext = { params: { projectId: string } };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { projectId } = params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      _count: { select: { scenes: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project._count.scenes === 0) {
    return NextResponse.json(
      { error: "Project has no scenes — run /generate first" },
      { status: 422 }
    );
  }

  if (project.status === "generating" || project.status === "rendering") {
    return NextResponse.json(
      { error: `Project is already '${project.status}'` },
      { status: 409 }
    );
  }

  const job = await videoRenderQueue.add(
    "render",
    { projectId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );

  return NextResponse.json({ jobId: job.id, projectId }, { status: 202 });
}
