import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/image-gen";

type RouteContext = { params: { sceneId: string } };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const scene = await prisma.scene.findUnique({ where: { id: params.sceneId } });

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }
  if (!scene.imagePrompt) {
    return NextResponse.json(
      { error: "Scene has no image prompt — regenerate scenes first" },
      { status: 422 }
    );
  }

  const imageUrl = await generateImage(scene.imagePrompt, scene.id);

  const updated = await prisma.scene.update({
    where: { id: params.sceneId },
    data: { imageUrl },
  });

  return NextResponse.json({ scene: updated });
}
