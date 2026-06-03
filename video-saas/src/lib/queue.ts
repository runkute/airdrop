import { Queue } from "bullmq";
import { redis } from "./redis";

export interface VideoRenderJobData {
  projectId: string;
}

declare global {
  // eslint-disable-next-line no-var
  var _videoRenderQueue: Queue<VideoRenderJobData> | undefined;
}

export const videoRenderQueue: Queue<VideoRenderJobData> =
  globalThis._videoRenderQueue ??
  new Queue<VideoRenderJobData>("video-render", { connection: redis });

if (process.env.NODE_ENV !== "production") {
  globalThis._videoRenderQueue = videoRenderQueue;
}
