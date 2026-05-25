"use client"

import { useState, useEffect } from "react"
import { User, Building2, Users, Plug, Bot, Eye, EyeOff, Check, Loader2, Trash2, Shield } from "lucide-react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/store/auth-store"
import { authApi } from "@/lib/api/auth"
import { apiClient } from "@/lib/api/client"
import type { WorkspaceMembership } from "@/lib/types"

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, "Required"),
  new_password: z.string().min(8, "Minimum 8 characters"),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "editor", "analyst", "viewer"]),
})

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  editor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  analyst: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

function MaskedApiKey({ value }: { value: string }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="text-muted-foreground text-sm italic">Not configured</span>
  const masked = value.slice(0, 8) + "••••••••••••••••" + value.slice(-4)
  return (
    <div className="flex items-center gap-2">
      <code className="text-sm font-mono">{show ? value : masked}</code>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { user, currentWorkspace, fetchMe } = useAuthStore()
  const [members, setMembers] = useState<WorkspaceMembership[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const profileForm = useForm({ resolver: zodResolver(profileSchema), defaultValues: { full_name: user?.full_name ?? "" } })
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { current_password: "", new_password: "", confirm_password: "" } })
  const inviteForm = useForm({ resolver: zodResolver(inviteSchema), defaultValues: { email: "", role: "editor" as const } })

  useEffect(() => {
    if (user) profileForm.reset({ full_name: user.full_name })
  }, [user])

  useEffect(() => {
    if (!currentWorkspace) return
    setIsLoadingMembers(true)
    apiClient
      .get<{ items: WorkspaceMembership[] }>(`/workspaces/${currentWorkspace.id}/members`)
      .then((data) => setMembers(data.items ?? []))
      .catch(() => {})
      .finally(() => setIsLoadingMembers(false))
  }, [currentWorkspace])

  async function saveProfile(data: { full_name: string }) {
    setIsSavingProfile(true)
    try {
      await authApi.updateProfile(data)
      await fetchMe()
      toast({ title: "Profile updated" })
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function changePassword(data: { current_password: string; new_password: string }) {
    setIsSavingPassword(true)
    try {
      await authApi.changePassword({ current_password: data.current_password, new_password: data.new_password })
      passwordForm.reset()
      toast({ title: "Password changed successfully" })
    } catch {
      toast({ title: "Password change failed", description: "Current password may be incorrect.", variant: "destructive" })
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function inviteMember(data: { email: string; role: string }) {
    if (!currentWorkspace) return
    try {
      await apiClient.post(`/workspaces/${currentWorkspace.id}/members`, data)
      toast({ title: "Invitation sent", description: `${data.email} has been added as ${data.role}.` })
      setShowInviteModal(false)
      inviteForm.reset()
      const updated = await apiClient.get<{ items: WorkspaceMembership[] }>(`/workspaces/${currentWorkspace.id}/members`)
      setMembers(updated.items ?? [])
    } catch {
      toast({ title: "Invite failed", variant: "destructive" })
    }
  }

  async function removeMember(userId: string) {
    if (!currentWorkspace) return
    try {
      await apiClient.delete(`/workspaces/${currentWorkspace.id}/members/${userId}`)
      setMembers((m) => m.filter((mb) => mb.user_id !== userId))
      toast({ title: "Member removed" })
    } catch {
      toast({ title: "Could not remove member", variant: "destructive" })
    }
  }

  const integrations = [
    { id: "facebook", name: "Facebook Pages", description: "Publish posts to Facebook Pages", category: "Social", connected: false },
    { id: "instagram", name: "Instagram Business", description: "Publish to Instagram Business accounts", category: "Social", connected: false },
    { id: "wordpress", name: "WordPress", description: "Publish articles to WordPress sites", category: "CMS", connected: false },
    { id: "meta_ads", name: "Meta Ads", description: "Monitor Facebook & Instagram ad campaigns", category: "Ads", connected: false },
    { id: "google_ads", name: "Google Ads", description: "Monitor Google ad campaigns and keywords", category: "Ads", connected: false },
    { id: "tiktok_ads", name: "TikTok Ads", description: "Monitor TikTok ad performance", category: "Ads", connected: false },
  ]

  const aiProviders = [
    { id: "openai", name: "OpenAI", description: "GPT-4o for ad copy and social posts", envKey: "OPENAI_API_KEY", placeholder: "sk-..." },
    { id: "anthropic", name: "Anthropic Claude", description: "Claude for SEO content and email", envKey: "ANTHROPIC_API_KEY", placeholder: "sk-ant-..." },
    { id: "google", name: "Google Gemini", description: "Gemini for research and analysis", envKey: "GOOGLE_API_KEY", placeholder: "AIza..." },
    { id: "grok", name: "xAI Grok", description: "Grok for trend analysis", envKey: "GROK_API_KEY", placeholder: "xai-..." },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div {...fadeIn}>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account, workspace, and integrations</p>
      </motion.div>

      <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="workspace" className="gap-2"><Building2 className="h-3.5 w-3.5" />Workspace</TabsTrigger>
            <TabsTrigger value="members" className="gap-2"><Users className="h-3.5 w-3.5" />Members</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2"><Plug className="h-3.5 w-3.5" />Integrations</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Bot className="h-3.5 w-3.5" />AI Providers</TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                      {user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Separator />
                <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input {...profileForm.register("full_name")} />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-xs text-red-500">{profileForm.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={user?.email ?? ""} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                  </div>
                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your login password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
                  {(["current_password", "new_password", "confirm_password"] as const).map((field) => (
                    <div key={field} className="space-y-2">
                      <Label>{field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Label>
                      <Input type="password" {...passwordForm.register(field)} />
                      {passwordForm.formState.errors[field] && (
                        <p className="text-xs text-red-500">{passwordForm.formState.errors[field]?.message}</p>
                      )}
                    </div>
                  ))}
                  <Button type="submit" variant="outline" disabled={isSavingPassword}>
                    {isSavingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WORKSPACE */}
          <TabsContent value="workspace">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>Manage your workspace configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input defaultValue={currentWorkspace?.name ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Workspace Slug</Label>
                  <Input defaultValue={currentWorkspace?.slug ?? ""} disabled className="bg-muted font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 capitalize">
                      {currentWorkspace?.plan ?? "Free"}
                    </Badge>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">Upgrade Plan →</Button>
                  </div>
                </div>
                <Button>Save Workspace Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MEMBERS */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to this workspace</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowInviteModal(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingMembers ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                            {member.user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{member.user?.full_name ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                        </div>
                        <Badge className={`${ROLE_COLORS[member.role] ?? ""} border-0 capitalize`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {member.role}
                        </Badge>
                        {member.user_id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => removeMember(member.user_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRATIONS */}
          <TabsContent value="integrations">
            <div className="space-y-3">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Plug className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{integration.name}</p>
                          <Badge variant="outline" className="text-xs">{integration.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <Button
                      variant={integration.connected ? "outline" : "default"}
                      size="sm"
                    >
                      {integration.connected ? (
                        <><Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />Connected</>
                      ) : "Connect"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AI PROVIDERS */}
          <TabsContent value="ai">
            <div className="space-y-3">
              {aiProviders.map((provider) => (
                <Card key={provider.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Bot className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{provider.name}</p>
                          <p className="text-xs text-muted-foreground">{provider.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{provider.envKey}</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <MaskedApiKey value="" />
                        </div>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set via environment variable <code className="font-mono bg-muted px-1 rounded">{provider.envKey}</code> in your deployment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Invite Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={inviteForm.handleSubmit(inviteMember)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input placeholder="colleague@company.com" {...inviteForm.register("email")} />
              {inviteForm.formState.errors.email && (
                <p className="text-xs text-red-500">{inviteForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                defaultValue="editor"
                onValueChange={(v) => inviteForm.setValue("role", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full workspace access</SelectItem>
                  <SelectItem value="editor">Editor — Create and publish content</SelectItem>
                  <SelectItem value="analyst">Analyst — View reports and ads data</SelectItem>
                  <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
              <Button type="submit">Send Invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
