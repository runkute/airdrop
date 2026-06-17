"use client"

import { useState, KeyboardEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, Plus } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BrandTone, WritingStyle, type BrandVoice } from "@/lib/types"

const voiceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  tone: z.nativeEnum(BrandTone),
  writing_style: z.nativeEnum(WritingStyle),
  cta_style: z.string().optional(),
  forbidden_words: z.array(z.string()).optional(),
  emotional_positioning: z.string().optional(),
  keyword_preferences: z.array(z.string()).optional(),
  example_content: z.string().optional(),
  is_default: z.boolean().optional(),
})

export type VoiceFormData = z.infer<typeof voiceSchema>

const toneOptions = [
  { value: BrandTone.PROFESSIONAL, label: "Professional" },
  { value: BrandTone.CASUAL, label: "Casual" },
  { value: BrandTone.PLAYFUL, label: "Playful" },
  { value: BrandTone.AUTHORITATIVE, label: "Authoritative" },
  { value: BrandTone.EMPATHETIC, label: "Empathetic" },
  { value: BrandTone.BOLD, label: "Bold" },
]

const styleOptions = [
  { value: WritingStyle.CONCISE, label: "Concise" },
  { value: WritingStyle.DETAILED, label: "Detailed" },
  { value: WritingStyle.STORYTELLING, label: "Storytelling" },
  { value: WritingStyle.DATA_DRIVEN, label: "Data-driven" },
  { value: WritingStyle.CONVERSATIONAL, label: "Conversational" },
]

interface VoiceFormProps {
  defaultValues?: Partial<BrandVoice>
  onSubmit: (data: VoiceFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
}

export function VoiceForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "Save Brand Voice",
}: VoiceFormProps) {
  const [keywordInput, setKeywordInput] = useState("")
  const [keywords, setKeywords] = useState<string[]>(
    defaultValues?.keyword_preferences ?? []
  )
  const [forbiddenInput, setForbiddenInput] = useState("")
  const [forbidden, setForbidden] = useState<string[]>(
    defaultValues?.forbidden_words ?? []
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<VoiceFormData>({
    resolver: zodResolver(voiceSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      tone: defaultValues?.tone ?? BrandTone.PROFESSIONAL,
      writing_style: defaultValues?.writing_style ?? WritingStyle.CONCISE,
      cta_style: defaultValues?.cta_style ?? "",
      emotional_positioning: defaultValues?.emotional_positioning ?? "",
      example_content: defaultValues?.example_content ?? "",
      is_default: defaultValues?.is_default ?? false,
    },
  })

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw])
      setKeywordInput("")
    }
  }

  const addForbidden = () => {
    const w = forbiddenInput.trim()
    if (w && !forbidden.includes(w)) {
      setForbidden((prev) => [...prev, w])
      setForbiddenInput("")
    }
  }

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    action: () => void
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      action()
    }
  }

  const handleFormSubmit = (data: VoiceFormData) => {
    onSubmit({ ...data, keyword_preferences: keywords, forbidden_words: forbidden })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-5 pb-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Voice Name *</Label>
            <Input
              placeholder="e.g., Brand Primary Voice"
              error={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Tone & Style */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tone *</Label>
              <Controller
                name="tone"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {toneOptions.map((opt) => (
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
              <Label>Writing Style *</Label>
              <Controller
                name="writing_style"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {styleOptions.map((opt) => (
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

          {/* Emotional positioning */}
          <div className="space-y-1.5">
            <Label>Emotional Positioning</Label>
            <Input
              placeholder="e.g., Empowering entrepreneurs to achieve their potential"
              {...register("emotional_positioning")}
            />
          </div>

          {/* CTA Style */}
          <div className="space-y-1.5">
            <Label>CTA Style</Label>
            <Input
              placeholder='e.g., "Start your free trial today"'
              {...register("cta_style")}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Keyword Preferences</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, addKeyword)}
                placeholder="Add keyword, press Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
                  >
                    {kw}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Forbidden words */}
          <div className="space-y-2">
            <Label>Forbidden Words</Label>
            <div className="flex gap-2">
              <Input
                value={forbiddenInput}
                onChange={(e) => setForbiddenInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, addForbidden)}
                placeholder="Add forbidden word, press Enter"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addForbidden}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {forbidden.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {forbidden.map((w) => (
                  <Badge
                    key={w}
                    variant="outline"
                    className="gap-1 cursor-pointer border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
                    onClick={() => setForbidden((prev) => prev.filter((f) => f !== w))}
                  >
                    {w}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Example content */}
          <div className="space-y-1.5">
            <Label>Example Content</Label>
            <Textarea
              placeholder="Paste an example of content written in this brand voice..."
              className="min-h-[80px] resize-none"
              {...register("example_content")}
            />
          </div>

          {/* Is default */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Set as default voice</p>
              <p className="text-xs text-muted-foreground">
                This voice will be pre-selected in content generation
              </p>
            </div>
            <Controller
              name="is_default"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} variant="gradient" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
