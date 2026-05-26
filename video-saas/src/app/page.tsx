import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "AI Script Generation",
    description: "Describe your idea and let AI write a compelling script with scene-by-scene breakdown.",
    icon: "✍️",
  },
  {
    title: "Image & Visual Synthesis",
    description: "Each scene gets a unique AI-generated image that matches the narrative.",
    icon: "🎨",
  },
  {
    title: "Voiceover & Audio",
    description: "Realistic AI voices narrate your story with natural intonation and pacing.",
    icon: "🎙️",
  },
  {
    title: "One-Click Rendering",
    description: "Scenes are stitched together into a polished short video ready to share.",
    icon: "🎬",
  },
];

const statuses = [
  { label: "Draft", color: "secondary" },
  { label: "Generating", color: "default" },
  { label: "Rendering", color: "default" },
  { label: "Completed", color: "secondary" },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span>ClipForge</span>
            <Badge variant="secondary">Beta</Badge>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" size="sm">Sign in</Button>
            <Button size="sm">Get started</Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="container py-24 text-center">
          <Badge variant="outline" className="mb-4">AI-Powered Short Video Generation</Badge>
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">
            Turn ideas into videos
            <br />
            <span className="text-primary">in seconds</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            ClipForge uses AI to write scripts, generate images, add voiceovers, and render
            short-form videos — all from a single prompt.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg">Start for free</Button>
            <Button size="lg" variant="outline">Watch demo</Button>
          </div>
        </section>

        <section className="container py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need to ship viral videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container py-16">
          <h2 className="text-3xl font-bold text-center mb-4">Project lifecycle</h2>
          <p className="text-center text-muted-foreground mb-12">
            Every project moves through four transparent stages
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {statuses.map((s, i) => (
              <div key={s.label} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {i + 1}
                  </div>
                  <Badge variant={s.color}>{s.label}</Badge>
                </div>
                {i < statuses.length - 1 && (
                  <div className="h-px w-16 bg-border hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ClipForge. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
