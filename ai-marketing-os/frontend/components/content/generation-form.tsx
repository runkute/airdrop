"use client"

import { useState, KeyboardEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Sparkles, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContentType, Platform, AIProvider, type BrandVoice } from "@/lib/types"

const generationSchema = z.object({
  content_type: z.nativeEnum(ContentType),
  platform: z.nativeEnum(Platform),
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  target_audience: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  ai_provider: z.nativeEnum(AIProvider).optional(),
  word_count: z.number().min(50).max(5000).optional(),
  cta: z.string().optional(),
  brand_voice_id: z.string().optional(),
  additional_instructions: z.string().optional(),
})

export type GenerationFormData = z.infer<typeof generationSchema>

const contentTypeOptions = [
  { value: ContentType.SOCIAL_POST, label: "Social Post" },
  { value: ContentType.SEO_ARTICLE, label: "SEO Article" },
  { value: ContentType.AD_COPY, label: "Ad Copy" },
  { value: ContentType.REEL_SCRIPT, label: "Reel Script" },
  { value: ContentType.HASHTAGS, label: "Hashtags" },
  { value: ContentType.EMAIL, label: "Email" },
  { value: ContentType.BLOG_POST, label: "Blog Post" },
  { value: ContentType.PRODUCT_DESCRIPTION, label: "Product Description" },
]

const platformOptions = [
  { value: Platform.INSTAGRAM, label: "Instagram" },
  { value: Platform.FACEBOOK, label: "Facebook" },
  { value: Platform.TWITTER, label: "Twitter / X" },
  { value: Platform.LINKEDIN, label: "LinkedIn" },
  { value: Platform.TIKTOK, label: "TikTok" },
  { value: Platform.YOUTUBE, label: "YouTube" },
  { value: Platform.GOOGLE, label: "Google" },
  { value: Platform.EMAIL, label: "Email" },
  { value: Platform.WEBSITE, label: "Website" },
]

const providerOptions = [
  { value: AIProvider.AUTO, label: "Auto (Best available)" },
  { value: AIProvider.OPENAI, label: "OpenAI (GPT-4o)" },
  { value: AIProvider.ANTHROPIC, label: "Anthropic (Claude)" },
  { value: AIProvider.GOOGLE, label: "Google (Gemini)" },
  { value: AIProvider.GROK, label: "xAI (Grok)" },
]

const wordCountOptions = [
  { value: 100, label: "Short (~100 words)" },
  { value: 250, label: "Medium (~250 words)" },
  { value: 500, label: "Long (~500 words)" },
  { value: 1000, label: "Article (~1000 words)" },
  { value: 2000, label: "Long-form (~2000 words)" },
]

interface GenerationFormProps {
  brandVoices: BrandVoice[]
  onSubmit: (data: GenerationFormData) => Promise<void>
  isGenerating: boolean
}

export function GenerationForm({
  brandVoices,
  onSubmit,
  isGenerating,
}: GenerationFormProps) {
  const [keywordInput, setKeywordInput] = useState("")
  const [keywords, setKeywords] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GenerationFormData>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      content_type: ContentType.SOCIAL_POST,
      platform: Platform.INSTAGRAM,
      ai_provider: AIProvider.AUTO,
      word_count: 250,
    },
  })

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw])
      setKeywordInput("")
    }
  }

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  const handleKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addKeyword()
    }
  }

  const handleFormSubmit = (data: GenerationFormData) => {
    onSubmit({ ...data, keywords })
  }

  return (
    <ScrollArea className="h-full">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-5 space-y-5">
        <div className="space-y-1">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Generator
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure and generate premium AI content
          </p>
        </div>

        <Separator />

        {/* Content type & Platform */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Content Type</Label>
            <Controller
              name="content_type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Platform</Label>
            <Controller
              name="platform"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platformOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Topic */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Topic / Prompt *</Label>
          <Textarea
            placeholder="e.g., Announce our new AI-powered marketing features that help brands grow 3x faster..."
            className="min-h-[80px] text-sm resize-none"
            error={!!errors.topic}
            {...register("topic")}
          />
          {errors.topic && (
            <p className="text-xs text-destructive">{errors.topic.message}</p>
          )}
        </div>

        {/* Target Audience */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Target Audience</Label>
          <Input
            placeholder="e.g., Marketing managers at B2B SaaS companies, 30-45"
            className="text-sm"
            {...register("target_audience")}
          />
        </div>

        {/* Keywords */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Keywords</Label>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder="Add keyword, press Enter"
              className="text-sm flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addKeyword}
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {keywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="gap-1 text-xs cursor-pointer hover:bg-destructive/10"
                  onClick={() => removeKeyword(kw)}
                >
                  {kw}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* AI Provider & Word Count */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">AI Provider</Label>
            <Controller
              name="ai_provider"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target Length</Label>
            <Controller
              name="word_count"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(parseInt(v))}
                  defaultValue={String(field.value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wordCountOptions.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Call to Action (CTA)</Label>
          <Input
            placeholder='e.g., "Start your free trial", "Learn more"'
            className="text-sm"
            {...register("cta")}
          />
        </div>

        {/* Brand Voice */}
        {brandVoices.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Brand Voice</Label>
            <Controller
              name="brand_voice_id"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={
                    brandVoices.find((v) => v.is_default)?.id
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select brand voice..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No brand voice</SelectItem>
                    {brandVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                        {voice.is_default && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* Additional instructions */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Additional Instructions{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            placeholder="Any specific tone, format, or requirements..."
            className="min-h-[60px] text-sm resize-none"
            {...register("additional_instructions")}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          variant="gradient"
          loading={isGenerating}
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Content"}
        </Button>
      </form>
    </ScrollArea>
  )
}
