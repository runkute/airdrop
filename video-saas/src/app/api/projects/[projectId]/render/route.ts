import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAudio } from "@/lib/tts";
import { generateImage } from "@/lib/image-gen";

type RouteContext = { params: { projectId: string } };

type SceneResult =
  | { sceneId: string; audioUrl: string; imageUrl: string }
  | { sceneId: string; error: string };

async function processScene(scene: {
  id: string;
  text: string | null;
  imagePrompt: string | null;
}): Promise<SceneResult> {
  try {
    const narration = scene.text ?? "";
    const prompt = scene.imagePrompt ?? "";

    if (!narration && !prompt) {
      return { sceneId: scene.id, error: "Scene has no text or image prompt" };
    }

    // Generate audio and image concurrently for this scene
    const [audioUrl, imageUrl] = await Promise.all([
      narration
        ? generateAudio(narration, scene.id)
        : Promise.resolve(""),
      prompt
        ? generateImage(prompt, scene.id)
        : Promise.resolve(""),
    ]);

    // Persist results to DB immediately so partial progress is not lost
    await prisma.scene.update({
      where: { id: scene.id },
      data: {
        ...(audioUrl ? { audioUrl } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    });

    return { sceneId: scene.id, audioUrl, imageUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[render] scene ${scene.id} failed:`, err);
    return { sceneId: scene.id, error: message };
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { projectId } = params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.scenes.length === 0) {
    return NextResponse.json(
      { error: "Project has no scenes to render" },
      { status: 422 }
    );
  }

  // Only allow rendering from completed (scenes generated) or draft state
  if (project.status === "generating" || project.status === "rendering") {
    return NextResponse.json(
      { error: `Project is already in '${project.status}' state` },
      { status: 409 }
    );
  }

  // Mark project as rendering
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "rendering" },
  });

  // Process every scene concurrently
  const results = await Promise.all(project.scenes.map(processScene));

  const failures = results.filter(
    (r): r is { sceneId: string; error: string } => "error" in r
  );

  const finalStatus = failures.length === 0 ? "completed" : "draft";

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: { status: finalStatus },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  const status = failures.length === 0 ? 200 : 207;
  return NextResponse.json(
    {
      project: updatedProject,
      ...(failures.length > 0 ? { failures } : {}),
    },
    { status }
  );
}
