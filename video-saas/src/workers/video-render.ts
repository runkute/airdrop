/**
 * BullMQ worker — runs as a standalone Node.js process, NOT inside Next.js.
 *
 * Start with:  npm run worker
 * (uses tsx to execute TypeScript directly)
 */
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { PrismaClient } from "@prisma/client";
import { uploadToStorage } from "../lib/storage";
import { renderProject, type SceneInput } from "../lib/ffmpeg-render";
import type { VideoRenderJobData } from "../lib/queue";

// ---------------------------------------------------------------------------
// Clients (singletons for the process lifetime)
// ---------------------------------------------------------------------------

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Media downloader
// ---------------------------------------------------------------------------

async function download(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Download failed for ${url} — HTTP ${res.status}`);
  await fs.writeFile(destPath, Buffer.from(await res.arrayBuffer()));
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processJob(job: Job<VideoRenderJobData>): Promise<{ videoUrl: string }> {
  const { projectId } = job.data;

  // 1. Load project and scenes
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      scenes: { orderBy: { order: "asc" } },
    },
  });

  if (!project) throw new Error(`Project ${projectId} not found`);
  if (project.scenes.length === 0)
    throw new Error(`Project ${projectId} has no scenes`);

  const missingMedia = project.scenes.filter(
    (s) => !s.imageUrl || !s.audioUrl
  );
  if (missingMedia.length > 0) {
    throw new Error(
      `Scenes missing media: ${missingMedia.map((s) => s.id).join(", ")} — run the media generation step first`
    );
  }

  // 2. Mark project as rendering
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "rendering" },
  });

  // 3. Create temp workspace
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `clipforge-${projectId}-`)
  );

  try {
    // 4. Download all media concurrently
    await job.updateProgress(5);

    const sceneInputs: SceneInput[] = await Promise.all(
      project.scenes.map(async (scene) => {
        const imagePath = path.join(tempDir, `img_${scene.id}.png`);
        const audioPath = path.join(tempDir, `aud_${scene.id}.mp3`);

        await Promise.all([
          download(scene.imageUrl!, imagePath),
          download(scene.audioUrl!, audioPath),
        ]);

        return {
          imagePath,
          audioPath,
          text: scene.text ?? "",
          order: scene.order,
        };
      })
    );

    await job.updateProgress(20);

    // 5. Render video (sequential per-scene FFmpeg passes)
    const finalVideoPath = await renderProject(sceneInputs, tempDir);

    await job.updateProgress(85);

    // 6. Upload final MP4 to storage
    const videoBuffer = await fs.readFile(finalVideoPath);
    const videoUrl = await uploadToStorage(
      `videos/${projectId}.mp4`,
      videoBuffer,
      "video/mp4"
    );

    await job.updateProgress(95);

    // 7. Persist video URL + completed status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "completed", videoUrl },
    });

    // 8. Deduct 10 credits from the project owner
    await prisma.userCredits.upsert({
      where: { userId: project.userId },
      create: {
        userId: project.userId,
        balance: -10, // starts negative if no prior credits record
      },
      update: { balance: { decrement: 10 } },
    });

    await job.updateProgress(100);
    return { videoUrl };
  } finally {
    // Always clean up temp files, even on failure
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker<VideoRenderJobData>(
  "video-render",
  processJob,
  {
    connection: redis,
    concurrency: 2, // at most 2 renders simultaneously
  }
);

worker.on("completed", (job, result: { videoUrl: string }) => {
  console.log(
    `[worker] ✓ job ${job.id} — project ${job.data.projectId} → ${result.videoUrl}`
  );
});

worker.on("failed", async (job, err) => {
  console.error(
    `[worker] ✗ job ${job?.id} — project ${job?.data?.projectId}: ${err.message}`
  );
  if (job?.data?.projectId) {
    // Revert to draft so the user can retry
    await prisma.project
      .update({
        where: { id: job.data.projectId },
        data: { status: "draft" },
      })
      .catch(() => {});
  }
});

worker.on("progress", (job, progress) => {
  console.log(`[worker] job ${job.id} progress: ${progress}%`);
});

console.log("[worker] video-render worker started (concurrency=2)");

// Graceful shutdown
async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
