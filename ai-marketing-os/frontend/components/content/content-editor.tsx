"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Copy,
  Check,
  Calendar,
  Save,
  Trash2,
  Sparkles,
  FileText,
  Cpu,
  DollarSign,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { GenerateContentResponse } from "@/lib/types"

interface ContentEditorProps {
  content: string
  generationData: GenerateContentResponse | null
  isGenerating: boolean
  onChange: (content: string) => void
  onSaveDraft: () => void
  onSchedule: () => void
  onDiscard: () => void
  isSaving?: boolean
}

export function ContentEditor({
  content,
  generationData,
  isGenerating,
  onChange,
  onSaveDraft,
  onSchedule,
  onDiscard,
  isSaving,
}: ContentEditorProps) {
  const [copied, setCopied] = useState(false)
  const wordCount = content
    ? content.trim().split(/\s+/).filter(Boolean).length
    : 0
  const charCount = content.length

  const handleCopy = async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </motion.div>
          <span className="text-sm font-medium text-primary">AI is generating your content...</span>
        </div>
        <Skeleton className="h-[300px] w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (!content && !generationData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-2xl bg-primary/5 p-6 mb-4">
          <Sparkles className="h-12 w-12 text-primary/40" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Generated content will appear here</h3>
        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
          Fill in the form on the left and click &quot;Generate Content&quot; to create
          AI-powered marketing copy.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {wordCount} words · {charCount} chars
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="h-full w-full border-0 rounded-none resize-none text-sm leading-relaxed focus-visible:ring-0 p-5"
          placeholder="Your generated content will appear here..."
        />
      </div>

      {/* AI Usage stats */}
      {generationData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 py-3 bg-muted/30 border-t flex-shrink-0"
        >
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" />
              <span>{generationData.provider}/{generationData.model}</span>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span>{generationData.total_tokens.toLocaleString()} tokens</span>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              <span>${generationData.cost_usd.toFixed(4)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-5 py-4 border-t flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveDraft}
          loading={isSaving}
          className="flex-1"
        >
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button
          size="sm"
          onClick={onSchedule}
          className="flex-1"
          variant="gradient"
        >
          <Calendar className="h-4 w-4" />
          Schedule
        </Button>
      </div>
    </div>
  )
}
