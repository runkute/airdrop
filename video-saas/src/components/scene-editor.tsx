"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RefreshCw,
  Save,
  Check,
  X,
  Video,
  Loader2,
  AlertCircle,
  ImageOff,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SceneData {
  id: string;
  order: number;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  imagePrompt: string | null;
  duration: number;
}

export interface ProjectData {
  id: string;
  title: string;
  status: string;
  videoUrl: string | null;
  scenes: SceneData[];
}

// ---------------------------------------------------------------------------
// SceneCard
// ---------------------------------------------------------------------------

function SceneCard({
  scene,
  onUpdate,
}: {
  scene: SceneData;
  onUpdate: (id: string, patch: Partial<SceneData>) => void;
}) {
  const [text, setText] = useState(scene.text ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep text in sync if parent resets the scene (e.g. after a save by another means)
  useEffect(() => {
    if (!isDirty) setText(scene.text ?? "");
  }, [scene.text, isDirty]);

  function handleTextChange(val: string) {
    setText(val);
    setIsDirty(val !== (scene.text ?? ""));
    if (saveStatus !== "idle") setSaveStatus("idle");
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/scenes/${scene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      onUpdate(scene.id, { text });
      setIsDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegenerateImage() {
    setIsRegenerating(true);
    setRegenError(null);
    try {
      const res = await fetch(`/api/scenes/${scene.id}/regenerate-image`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Regeneration failed");
      onUpdate(scene.id, { imageUrl: data.scene.imageUrl });
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setIsRegenerating(false);
    }
  }

  function toggleAudio() {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      void el.play();
    }
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Card header: scene number + duration */}
      <CardHeader className="py-2.5 px-4 bg-muted/40 border-b flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center select-none">
            {scene.order}
          </span>
          <span className="text-sm font-semibold">Scene {scene.order}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock className="h-3 w-3" />
          {scene.duration.toFixed(1)}s
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* ── Image column ─────────────────────────────── */}
          <div className="flex-none w-36 space-y-2">
            {/* 9:16 thumbnail */}
            <div className="relative aspect-[9/16] rounded-md overflow-hidden bg-muted border">
              {isRegenerating && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground">Generating…</span>
                </div>
              )}

              {isRegenerating && !scene.imageUrl ? (
                <Skeleton className="absolute inset-0 rounded-none" />
              ) : scene.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={scene.imageUrl}
                  alt={`Scene ${scene.order}`}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isRegenerating && "opacity-30"
                  )}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                  <ImageOff className="h-7 w-7 opacity-30" />
                  <span className="text-[10px]">No image</span>
                </div>
              )}
            </div>

            {regenError && (
              <p className="text-[11px] text-destructive leading-tight">{regenError}</p>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleRegenerateImage}
              disabled={isRegenerating || !scene.imagePrompt}
              title={!scene.imagePrompt ? "No image prompt available" : undefined}
            >
              {isRegenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Regenerate
            </Button>
          </div>

          {/* ── Content column ───────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Narration textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Narration
              </label>
              <Textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Enter narration text…"
                className="min-h-[110px] resize-none text-sm leading-relaxed"
              />
              {/* Save row */}
              <div className="flex items-center justify-between min-h-[24px]">
                <span className="text-[11px] text-muted-foreground">
                  {text.length} chars
                </span>
                <div className="flex items-center gap-2">
                  {saveStatus === "saved" && (
                    <span className="text-[11px] text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-[11px] text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" />
                      Failed
                    </span>
                  )}
                  {isDirty && (
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3 gap-1.5"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      {isSaving ? "Saving…" : "Save"}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Audio preview */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Audio
              </span>
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="sm"
                className="h-8 gap-1.5 text-xs min-w-[100px]"
                onClick={toggleAudio}
                disabled={!scene.audioUrl}
                title={!scene.audioUrl ? "No audio generated yet" : undefined}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    {scene.audioUrl ? "Preview" : "No audio"}
                  </>
                )}
              </Button>
            </div>

            {/* Hidden audio element */}
            {scene.audioUrl && (
              <audio
                ref={audioRef}
                src={scene.audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RenderFooter
// ---------------------------------------------------------------------------

type RenderState = "idle" | "submitting" | "polling" | "success" | "error";

function RenderFooter({
  projectId,
  initialStatus,
  initialVideoUrl,
}: {
  projectId: string;
  initialStatus: string;
  initialVideoUrl: string | null;
}) {
  const getInitialState = (): RenderState => {
    if (initialStatus === "rendering") return "polling";
    if (initialStatus === "completed" && initialVideoUrl) return "success";
    return "idle";
  };

  const [state, setState] = useState<RenderState>(getInitialState);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) return;
        const { project } = await res.json();
        if (project.status === "completed") {
          setVideoUrl(project.videoUrl);
          setState("success");
          stopPolling();
        } else if (project.status === "draft") {
          // Worker reverted to draft = failure
          setState("error");
          setError("Rendering failed — check worker logs and try again.");
          stopPolling();
        }
      } catch {
        /* network hiccup — keep polling */
      }
    }, 3_000);
  }, [projectId, stopPolling]);

  // Auto-start polling if project is already rendering on mount
  useEffect(() => {
    if (state === "polling") startPolling();
    return stopPolling;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRender() {
    setState("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/render`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to queue render");
      setState("polling");
      startPolling();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-3xl py-4 space-y-2">
        {/* IDLE */}
        {state === "idle" && (
          <Button size="lg" className="w-full gap-2 text-base h-12" onClick={handleRender}>
            <Video className="h-5 w-5" />
            Render Video
          </Button>
        )}

        {/* SUBMITTING */}
        {state === "submitting" && (
          <Button size="lg" className="w-full gap-2 text-base h-12" disabled>
            <Loader2 className="h-5 w-5 animate-spin" />
            Queuing render…
          </Button>
        )}

        {/* POLLING */}
        {state === "polling" && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Rendering in background — this takes a few minutes…
            </div>
            {/* Indeterminate progress bar */}
            <div className="relative w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-primary rounded-full animate-[slide_1.8s_ease-in-out_infinite]" />
            </div>
            <style>{`
              @keyframes slide {
                0%   { transform: translateX(-100%); }
                100% { transform: translateX(300%); }
              }
            `}</style>
          </div>
        )}

        {/* SUCCESS */}
        {state === "success" && (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 font-medium text-green-600">
              <Check className="h-5 w-5 shrink-0" />
              Video rendered successfully!
            </div>
            {videoUrl && (
              <Button size="lg" asChild>
                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                  Watch Video
                </a>
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setState("idle");
                setVideoUrl(null);
              }}
            >
              Re-render
            </Button>
          </div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <div className="space-y-2">
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              size="lg"
              className="w-full gap-2 h-12"
              variant="outline"
              onClick={handleRender}
            >
              <Video className="h-5 w-5" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SceneEditor — main export
// ---------------------------------------------------------------------------

export function SceneEditor({ project }: { project: ProjectData }) {
  const [scenes, setScenes] = useState<SceneData[]>(project.scenes);

  function handleSceneUpdate(id: string, patch: Partial<SceneData>) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Sticky header ──────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-3xl flex h-14 items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold truncate">{project.title}</span>
            <Badge
              variant={
                project.status === "completed"
                  ? "secondary"
                  : project.status === "rendering"
                  ? "default"
                  : "outline"
              }
              className="shrink-0 capitalize"
            >
              {project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
            <span>{scenes.length} scene{scenes.length !== 1 ? "s" : ""}</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {totalDuration.toFixed(1)}s total
            </span>
          </div>
        </div>
      </header>

      {/* ── Scene list ─────────────────────────────────── */}
      <main className="flex-1 container max-w-3xl py-6 pb-32 space-y-4">
        <p className="text-sm text-muted-foreground">
          Edit narration, regenerate images, or preview audio for each scene. When
          you&apos;re happy, click <strong>Render Video</strong> below.
        </p>

        {scenes.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            <Video className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No scenes yet — generate a script first.</p>
          </div>
        ) : (
          scenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} onUpdate={handleSceneUpdate} />
          ))
        )}
      </main>

      {/* ── Sticky render footer ────────────────────────── */}
      <RenderFooter
        projectId={project.id}
        initialStatus={project.status}
        initialVideoUrl={project.videoUrl}
      />
    </div>
  );
}
