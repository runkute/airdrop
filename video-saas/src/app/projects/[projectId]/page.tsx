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

  const creditRecord = await prisma.userCredits.findUnique({
    where: { userId: project.userId },
    select: { balance: true },
  });

  const data: ProjectData = {
    id: project.id,
    userId: project.userId,
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

  return (
    <SceneEditor
      project={data}
      initialCredits={creditRecord?.balance ?? 0}
    />
  );
}
