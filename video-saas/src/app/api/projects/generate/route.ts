import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { scrapeUrl, isHttpUrl } from "@/lib/scraper";

const SCENE_SCHEMA = {
  type: "object",
  properties: {
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          narration_text: { type: "string" },
          image_prompt: { type: "string" },
          estimated_duration: { type: "number" },
        },
        required: ["narration_text", "image_prompt", "estimated_duration"],
        additionalProperties: false,
      },
    },
  },
  required: ["scenes"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a creative director specializing in short-form video content for YouTube Shorts.
Given source material, produce a compelling 60-second video script broken into scenes.

Rules:
- Total duration of all scenes must sum to ~60 seconds
- Each scene should be 4–12 seconds long
- narration_text: what the narrator says aloud (concise, punchy, conversational)
- image_prompt: a vivid Stable Diffusion / DALL-E style prompt describing the visual for that scene
- estimated_duration: number of seconds for the scene (float)
- Aim for 6–10 scenes
- Hook the viewer in scene 1, deliver value in the middle, end with a clear call-to-action`;

export async function POST(req: NextRequest) {
  let projectId: string | null = null;

  try {
    const body = await req.json();
    const { input, userId, title } = body as {
      input?: string;
      userId?: string;
      title?: string;
    };

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing or empty 'input' field" },
        { status: 400 }
      );
    }
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing 'userId' field" },
        { status: 400 }
      );
    }

    // Resolve source content
    let sourceText: string;
    if (isHttpUrl(input)) {
      sourceText = await scrapeUrl(input);
    } else {
      sourceText = input.trim().slice(0, 8_000);
      if (sourceText.length < 20) {
        return NextResponse.json(
          { error: "Input text is too short to generate a video script" },
          { status: 400 }
        );
      }
    }

    // Derive a title from the input if not provided
    const projectTitle =
      title?.trim() ||
      (isHttpUrl(input)
        ? `Video from ${new URL(input).hostname}`
        : sourceText.split(/\s+/).slice(0, 8).join(" ") + "…");

    // Create project in 'generating' state
    const project = await prisma.project.create({
      data: {
        title: projectTitle,
        status: "generating",
        userId,
      },
    });
    projectId = project.id;

    // Call Claude to generate scenes
    const message = await anthropic.messages
      .stream({
        model: "claude-opus-4-7",
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Create a 60-second YouTube Short video script from the following source material:\n\n${sourceText}`,
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            name: "video_scenes",
            schema: SCENE_SCHEMA,
            strict: true,
          },
        },
      })
      .finalMessage();

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content returned from Claude");
    }

    const parsed = JSON.parse(textBlock.text) as {
      scenes: Array<{
        narration_text: string;
        image_prompt: string;
        estimated_duration: number;
      }>;
    };

    if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("Claude returned an empty scenes array");
    }

    // Persist scenes and mark project completed in one transaction
    const completedProject = await prisma.$transaction(async (tx) => {
      await tx.scene.createMany({
        data: parsed.scenes.map((scene, i) => ({
          order: i + 1,
          text: scene.narration_text,
          imagePrompt: scene.image_prompt,
          duration: scene.estimated_duration,
          projectId: project.id,
        })),
      });

      return tx.project.update({
        where: { id: project.id },
        data: { status: "completed" },
        include: {
          scenes: {
            orderBy: { order: "asc" },
          },
        },
      });
    });

    return NextResponse.json({ project: completedProject }, { status: 201 });
  } catch (err) {
    // Revert project to draft so the user can retry
    if (projectId) {
      await prisma.project
        .update({ where: { id: projectId }, data: { status: "draft" } })
        .catch(() => {});
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[generate] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
