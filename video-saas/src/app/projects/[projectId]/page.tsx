import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SceneEditor, type ProjectData } from "@/components/scene-editor";

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  if (!project) notFound();

  // Serialize to a plain object — strips Date fields so the client
  // component receives a JSON-safe value.
  const data: ProjectData = {
    id: project.id,
    title: project.title,
    status: project.status,
    videoUrl: project.videoUrl,
    scenes: project.scenes.map((s) => ({
      id: s.id,
      order: s.order,
      text: s.text,
      imageUrl: s.imageUrl,
      audioUrl: s.audioUrl,
      imagePrompt: s.imagePrompt,
      duration: s.duration,
    })),
  };

  return <SceneEditor project={data} />;
}
