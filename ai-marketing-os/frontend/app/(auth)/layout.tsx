import type { Metadata } from "next"
import { Zap } from "lucide-react"

export const metadata: Metadata = {
  title: "Authentication",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-purple-700 p-12 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-white/20 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/20 translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white/10 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">AI Marketing OS</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Supercharge your
              <br />
              marketing with AI
            </h1>
            <p className="text-white/80 text-lg leading-relaxed max-w-md">
              Generate compelling content, manage ad campaigns, track performance,
              and grow your brand — all powered by cutting-edge AI.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: "✍️", text: "AI Content Generation for any platform" },
            { icon: "📊", text: "Unified Ads Dashboard with ROAS tracking" },
            { icon: "🎯", text: "Brand Voice management & consistency" },
            { icon: "📅", text: "Smart Publishing Calendar" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-white/90">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-primary rounded-lg p-1.5">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Marketing OS</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
