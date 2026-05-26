import OpenAI from "openai";
import { uploadToStorage } from "./storage";

declare global {
  // eslint-disable-next-line no-var
  var _openai: OpenAI | undefined;
}

const openai =
  globalThis._openai ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") globalThis._openai = openai;

/**
 * Generate a 9:16 vertical image from `prompt` and upload to storage.
 * Returns the public URL of the uploaded image.
 *
 * DALL-E 3 supports 1024×1792 (portrait 9:16) natively.
 */
export async function generateImage(
  prompt: string,
  sceneId: string
): Promise<string> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1792", // 9:16 portrait — YouTube Shorts native
    quality: "standard",
    response_format: "url",
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) throw new Error("DALL-E 3 returned no image URL");

  // Download the image from OpenAI's CDN (URLs are short-lived)
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download generated image — HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  const key = `images/${sceneId}.png`;
  return uploadToStorage(key, buffer, "image/png");
}
