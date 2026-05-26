import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { sceneId: string } };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const body = await req.json();
  const { text } = body as { text?: unknown };

  if (typeof text !== "string") {
    return NextResponse.json({ error: "'text' must be a string" }, { status: 400 });
  }

  const scene = await prisma.scene.update({
    where: { id: params.sceneId },
    data: { text },
  });

  return NextResponse.json({ scene });
}
