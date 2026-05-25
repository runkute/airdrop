"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, Plus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { VoiceCard } from "@/components/brand-voice/voice-card"
import { VoiceForm, type VoiceFormData } from "@/components/brand-voice/voice-form"
import { brandVoiceApi } from "@/lib/api/brand-voice"
import { useWorkspace } from "@/hooks/use-workspace"
import { toast } from "@/hooks/use-toast"
import { parseApiError } from "@/lib/utils"
import type { BrandVoice } from "@/lib/types"

export default function BrandVoicePage() {
  const { workspaceId } = useWorkspace()
  const [voices, setVoices] = useState<BrandVoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingVoice, setEditingVoice] = useState<BrandVoice | null>(null)
  const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (workspaceId) fetchVoices()
  }, [workspaceId])

  const fetchVoices = async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const data = await brandVoiceApi.getAll(workspaceId)
      setVoices(data)
    } catch {
      // Use mock data
      setVoices([
        {
          id: "v1",
          workspace_id: workspaceId,
          name: "Primary Brand Voice",
          tone: "professional" as never,
          writing_style: "concise" as never,
          cta_style: "Start your free trial today",
          forbidden_words: ["cheap", "basic", "simple"],
          emotional_positioning: "Empowering marketers to achieve extraordinary results",
          keyword_preferences: ["AI", "automation", "growth", "ROI", "performance"],
          example_content: "",
          is_default: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "v2",
          workspace_id: workspaceId,
          name: "Social Media Voice",
          tone: "casual" as never,
          writing_style: "conversational" as never,
          cta_style: "Join the community!",
          forbidden_words: ["corporate", "synergy"],
          emotional_positioning: "Fun, approachable, and relatable to everyday marketers",
          keyword_preferences: ["trending", "viral", "community", "tips"],
          example_content: "",
          is_default: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (data: VoiceFormData) => {
    if (!workspaceId) return
    setIsSubmitting(true)
    try {
      const voice = await brandVoiceApi.create(workspaceId, data as never)
      setVoices((prev) => [...prev, voice])
      setIsCreateOpen(false)
      toast({ title: "Brand voice created!", description: `"${voice.name}" has been added.` })
    } catch (error) {
      toast({
        title: "Creation failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: VoiceFormData) => {
    if (!workspaceId || !editingVoice) return
    setIsSubmitting(true)
    try {
      const updated = await brandVoiceApi.update(workspaceId, editingVoice.id, data as never)
      setVoices((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      setEditingVoice(null)
      toast({ title: "Brand voice updated!" })
    } catch (error) {
      toast({
        title: "Update failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!workspaceId || !deletingVoiceId) return
    setIsDeleting(true)
    try {
      await brandVoiceApi.delete(workspaceId, deletingVoiceId)
      setVoices((prev) => prev.filter((v) => v.id !== deletingVoiceId))
      setDeletingVoiceId(null)
      toast({ title: "Brand voice deleted" })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetDefault = async (voiceId: string) => {
    if (!workspaceId) return
    try {
      await brandVoiceApi.setDefault(workspaceId, voiceId)
      setVoices((prev) =>
        prev.map((v) => ({ ...v, is_default: v.id === voiceId }))
      )
      toast({ title: "Default voice updated!" })
    } catch (error) {
      toast({
        title: "Failed to set default",
        description: parseApiError(error),
        variant: "destructive",
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            Brand Voice
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define and manage your brand&apos;s communication style
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} variant="gradient">
          <Plus className="h-4 w-4" />
          New Brand Voice
        </Button>
      </div>

      {/* Voices grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-2xl bg-primary/5 p-8 mb-4">
            <Mic className="h-12 w-12 text-primary/30" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No brand voices yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-4">
            Create brand voices to ensure consistent AI-generated content across all platforms.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} variant="gradient">
            <Plus className="h-4 w-4" />
            Create First Brand Voice
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {voices.map((voice, index) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                onEdit={setEditingVoice}
                onDelete={setDeletingVoiceId}
                onSetDefault={handleSetDefault}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Brand Voice</DialogTitle>
            <DialogDescription>
              Define a new brand voice for AI content generation.
            </DialogDescription>
          </DialogHeader>
          <VoiceForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isSubmitting={isSubmitting}
            submitLabel="Create Brand Voice"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editingVoice}
        onOpenChange={(open) => !open && setEditingVoice(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Brand Voice</DialogTitle>
            <DialogDescription>
              Update the settings for &quot;{editingVoice?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          {editingVoice && (
            <VoiceForm
              defaultValues={editingVoice}
              onSubmit={handleEdit}
              onCancel={() => setEditingVoice(null)}
              isSubmitting={isSubmitting}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deletingVoiceId}
        onOpenChange={(open) => !open && setDeletingVoiceId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Brand Voice
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This brand voice will be permanently
              deleted and removed from all content generation settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingVoiceId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={isDeleting}
            >
              Delete Voice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
