import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";

export interface SceneInput {
  imagePath: string;
  audioPath: string;
  text: string;
  order: number;
}

const FPS = 25;
// Font search order — first match wins
const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
  "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Helvetica.ttc", // macOS
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCommand(cmd: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

function probeAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, meta) => {
      if (err) return reject(err);
      resolve(meta.format.duration ?? 5);
    });
  });
}

async function findFont(): Promise<string> {
  for (const f of FONT_CANDIDATES) {
    try {
      await fs.access(f);
      return f;
    } catch {
      /* try next */
    }
  }
  // Fall back to the first candidate and let ffmpeg error if it's missing
  return FONT_CANDIDATES[0];
}

/** Wrap text into lines of at most maxLen chars (word-boundary). */
function wrapText(text: string, maxLen = 34): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (lines.length === 3) break; // hard cap at 3 lines
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxLen && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < 3) lines.push(line);
  return lines;
}

/** Escape text for use inside a drawtext filter value wrapped in single quotes. */
function escapeDrawtext(text: string): string {
  return (
    text
      .replace(/\\/g, "\\\\") // backslash first
      .replace(/'/g, "\\'") // single quote
      // Colons are option separators at the outer level, but inside '…' they
      // are literal — no extra escaping needed here.
  );
}

// ---------------------------------------------------------------------------
// Per-scene clip renderer
// ---------------------------------------------------------------------------

async function renderSceneClip(
  scene: SceneInput,
  tempDir: string,
  fontPath: string
): Promise<string> {
  const duration = await probeAudioDuration(scene.audioPath);
  const frames = Math.ceil(duration * FPS) + FPS; // +1 s buffer for zoompan

  const outputPath = path.join(
    tempDir,
    `clip_${scene.order.toString().padStart(4, "0")}.mp4`
  );

  const lines = wrapText(scene.text, 34);

  // Build drawtext chain (one filter per line of text)
  const drawtextFilters = lines
    .map((line, i) => {
      const esc = escapeDrawtext(line);
      const yExpr = `h*0.78+${i * 62}`;
      return (
        `drawtext=fontfile='${fontPath}':text='${esc}':fontsize=52:fontcolor=white:` +
        `x=(w-text_w)/2:y=${yExpr}:box=1:boxcolor=black@0.5:boxborderw=14:` +
        `borderw=3:bordercolor=black@0.8`
      );
    })
    .join(",");

  // Full filter_complex string
  // [0:v] = looped still image — scale to 1080×1920, Ken-Burns zoom-in, optional drawtext
  // [1:a] = narration audio — reset timestamps
  const videoChain = [
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    `zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:fps=${FPS}:s=1080x1920`,
    ...(drawtextFilters ? [drawtextFilters] : []),
    "setpts=PTS-STARTPTS[vout]",
  ].join(",");

  const filterComplex = `${videoChain};[1:a]asetpts=PTS-STARTPTS[aout]`;

  await runCommand(
    ffmpeg()
      .input(scene.imagePath)
      .inputOptions(["-loop 1"])
      .input(scene.audioPath)
      .complexFilter(filterComplex)
      .outputOptions([
        "-map [vout]",
        "-map [aout]",
        "-c:v libx264",
        "-preset fast",
        "-crf 23",
        "-c:a aac",
        "-b:a 128k",
        "-movflags +faststart",
        "-shortest",
        `-t ${(duration + 0.15).toFixed(3)}`, // hard limit — matches audio length
      ])
      .output(outputPath)
  );

  return outputPath;
}

// ---------------------------------------------------------------------------
// Concat step
// ---------------------------------------------------------------------------

async function concatenateClips(
  clipPaths: string[],
  tempDir: string
): Promise<string> {
  const listFile = path.join(tempDir, "concat.txt");
  await fs.writeFile(
    listFile,
    clipPaths.map((p) => `file '${p}'`).join("\n"),
    "utf8"
  );

  const outputPath = path.join(tempDir, "final.mp4");

  await runCommand(
    ffmpeg()
      .input(listFile)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .output(outputPath)
  );

  return outputPath;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function renderProject(
  scenes: SceneInput[],
  tempDir: string
): Promise<string> {
  const fontPath = await findFont();
  const sorted = [...scenes].sort((a, b) => a.order - b.order);

  // Render clips sequentially to avoid saturating system resources
  const clipPaths: string[] = [];
  for (const scene of sorted) {
    const clip = await renderSceneClip(scene, tempDir, fontPath);
    clipPaths.push(clip);
  }

  if (clipPaths.length === 1) return clipPaths[0];
  return concatenateClips(clipPaths, tempDir);
}
