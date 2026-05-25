"use client"

import { motion } from "framer-motion"
import {
  Mic,
  Star,
  StarOff,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreHorizontal,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BrandVoice } from "@/lib/types"

const toneColors: Record<string, string> = {
  professional: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  casual: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  playful: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  authoritative: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  empathetic: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  bold: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

interface VoiceCardProps {
  voice: BrandVoice
  onEdit: (voice: BrandVoice) => void
  onDelete: (voiceId: string) => void
  onSetDefault: (voiceId: string) => void
  index?: number
}

export function VoiceCard({
  voice,
  onEdit,
  onDelete,
  onSetDefault,
  index = 0,
}: VoiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="premium-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold leading-tight">{voice.name}</h3>
                  {voice.is_default && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      toneColors[voice.tone] ??
                      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {voice.tone}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {voice.writing_style.replace(/-/g, " ")}
                  </span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(voice)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {!voice.is_default && (
                  <DropdownMenuItem onClick={() => onSetDefault(voice.id)}>
                    <Star className="h-4 w-4" />
                    Set as default
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(voice.id)}
                  className="text-destructive focus:text-destructive"
                  disabled={voice.is_default}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {voice.emotional_positioning && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Positioning</p>
              <p className="text-sm">{voice.emotional_positioning}</p>
            </div>
          )}

          {voice.cta_style && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">CTA Style</p>
              <p className="text-sm italic">&quot;{voice.cta_style}&quot;</p>
            </div>
          )}

          {voice.keyword_preferences.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Keywords</p>
              <div className="flex flex-wrap gap-1">
                {voice.keyword_preferences.slice(0, 5).map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs">
                    {kw}
                  </Badge>
                ))}
                {voice.keyword_preferences.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{voice.keyword_preferences.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {voice.forbidden_words.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Forbidden words</p>
              <div className="flex flex-wrap gap-1">
                {voice.forbidden_words.slice(0, 4).map((w) => (
                  <Badge
                    key={w}
                    variant="outline"
                    className="text-xs border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
                  >
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
