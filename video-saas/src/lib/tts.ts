import { ElevenLabsClient } from "elevenlabs";
import { uploadToStorage } from "./storage";

declare global {
  // eslint-disable-next-line no-var
  var _elevenlabs: ElevenLabsClient | undefined;
}

const client =
  globalThis._elevenlabs ??
  new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

if (process.env.NODE_ENV !== "production") globalThis._elevenlabs = client;

// "Rachel" is a neutral English voice; override via env.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/**
 * Synthesise `text` to MP3 audio and upload to storage.
 * Returns the public URL of the uploaded audio file.
 */
export async function generateAudio(
  text: string,
  sceneId: string
): Promise<string> {
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  // Returns a ReadableStream<Uint8Array> in the Node SDK
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_multilingual_v2",
    output_format: "mp3_44100_128",
  });

  // Collect stream chunks into a single buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const key = `audio/${sceneId}.mp3`;
  return uploadToStorage(key, buffer, "audio/mpeg");
}
