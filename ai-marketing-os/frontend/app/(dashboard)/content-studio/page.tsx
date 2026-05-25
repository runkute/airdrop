"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { PenTool, Calendar, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { GenerationForm, type GenerationFormData } from "@/components/content/generation-form"
import { ContentEditor } from "@/components/content/content-editor"
import { ContentTable, type ContentFilters } from "@/components/content/content-table"
import { useContentStore } from "@/store/content-store"
import { useWorkspace } from "@/hooks/use-workspace"
import { brandVoiceApi } from "@/lib/api/brand-voice"
import { toast } from "@/hooks/use-toast"
import { parseApiError } from "@/lib/utils"
import type { BrandVoice, ContentPost } from "@/lib/types"

export default function ContentStudioPage() {
  const { workspaceId } = useWorkspace()
  const {
    contentPosts,
    pagination,
    isGenerating,
    isLoading,
    generatedContent,
    editingContent,
    setEditingContent,
    clearGenerated,
    generateContent,
    fetchPosts,
    updatePost,
    deletePost,
    schedulePost,
    publishPost,
  } = useContentStore()

  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([])
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [schedulingPost, setSchedulingPost] = useState<ContentPost | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (workspaceId) {
      brandVoiceApi.getAll(workspaceId).then(setBrandVoices).catch(() => {})
      fetchPosts(workspaceId, { page: currentPage })
    }
  }, [workspaceId, currentPage, fetchPosts])

  const handleGenerate = async (data: GenerationFormData) => {
    try {
      await generateContent(data)
      toast({
        title: "Content generated!",
        description: "Your AI content is ready to review.",
      })
    } catch (error) {
      toast({
        title: "Generation failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    }
  }

  const handleSaveDraft = async () => {
    if (!generatedContent || !editingContent) return
    setIsSaving(true)
    try {
      await updatePost(generatedContent.post_id, {
        content: editingContent,
        status: "draft" as never,
      })
      toast({ title: "Draft saved!" })
      if (workspaceId) fetchPosts(workspaceId, { page: currentPage })
    } catch (error) {
      toast({
        title: "Save failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleScheduleClick = () => {
    if (generatedContent) {
      setSchedulingPost({
        id: generatedContent.post_id,
      } as ContentPost)
      setIsScheduleDialogOpen(true)
    }
  }

  const handleScheduleConfirm = async () => {
    if (!schedulingPost || !scheduleDate || !scheduleTime) {
      toast({ title: "Please select date and time", variant: "destructive" })
      return
    }
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      await schedulePost(schedulingPost.id, scheduledAt)
      toast({ title: "Post scheduled!", description: `Scheduled for ${scheduleDate} at ${scheduleTime}` })
      setIsScheduleDialogOpen(false)
      clearGenerated()
      if (workspaceId) fetchPosts(workspaceId, { page: currentPage })
    } catch (error) {
      toast({
        title: "Schedule failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    }
  }

  const handleSchedulePost = (post: ContentPost) => {
    setSchedulingPost(post)
    setIsScheduleDialogOpen(true)
  }

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId)
      toast({ title: "Post deleted" })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    }
  }

  const handlePublishPost = async (postId: string) => {
    try {
      await publishPost(postId)
      toast({ title: "Post published!" })
    } catch (error) {
      toast({
        title: "Publish failed",
        description: parseApiError(error),
        variant: "destructive",
      })
    }
  }

  const handleFilterChange = useCallback((filters: ContentFilters) => {
    if (workspaceId) {
      fetchPosts(workspaceId, {
        status: filters.status as never,
        content_type: filters.content_type as never,
        platform: filters.platform as never,
        page: 1,
      })
      setCurrentPage(1)
    }
  }, [workspaceId, fetchPosts])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenTool className="h-6 w-6 text-primary" />
          Content Studio
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate and manage AI-powered marketing content
        </p>
      </div>

      {/* Main generation area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[680px]">
        {/* Left: Generation Form */}
        <Card className="overflow-hidden border shadow-sm">
          <GenerationForm
            brandVoices={brandVoices}
            onSubmit={handleGenerate}
            isGenerating={isGenerating}
          />
        </Card>

        {/* Right: Content Editor */}
        <Card className="overflow-hidden border shadow-sm">
          <ContentEditor
            content={editingContent}
            generationData={generatedContent}
            isGenerating={isGenerating}
            onChange={setEditingContent}
            onSaveDraft={handleSaveDraft}
            onSchedule={handleScheduleClick}
            onDiscard={clearGenerated}
            isSaving={isSaving}
          />
        </Card>
      </div>

      <Separator />

      {/* Content Library */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Content Library</h2>
            <p className="text-sm text-muted-foreground">
              All your generated content in one place
            </p>
          </div>
          {pagination && (
            <span className="text-sm text-muted-foreground">
              {pagination.total} total posts
            </span>
          )}
        </div>
        <ContentTable
          posts={contentPosts}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={(page) => {
            setCurrentPage(page)
            if (workspaceId) fetchPosts(workspaceId, { page })
          }}
          onSchedule={handleSchedulePost}
          onDelete={handleDeletePost}
          onPublish={handlePublishPost}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsScheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleScheduleConfirm} variant="gradient">
              <Calendar className="h-4 w-4" />
              Schedule Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
