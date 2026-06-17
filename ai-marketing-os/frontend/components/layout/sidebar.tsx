"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  PenTool,
  Mic,
  Calendar,
  BarChart2,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronsUpDown,
  Check,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useUIStore } from "@/store/ui-store"
import { ScrollArea } from "@/components/ui/scroll-area"

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/content-studio",
    label: "Content Studio",
    icon: PenTool,
  },
  {
    href: "/brand-voice",
    label: "Brand Voice",
    icon: Mic,
  },
  {
    href: "/publishing",
    label: "Publishing",
    icon: Calendar,
  },
  {
    href: "/ads",
    label: "Ads Dashboard",
    icon: BarChart2,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user, currentWorkspace, workspaces, logout, setCurrentWorkspace } = useAuth()
  const { sidebarCollapsed, toggleSidebar, isMobileMenuOpen, setMobileMenuOpen } = useUIStore()

  const isActive = (href: string) => pathname.startsWith(href)

  const userInitials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U"

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-sidebar border-r border-sidebar-border lg:hidden"
          >
            <SidebarContent
              navItems={navItems}
              isActive={isActive}
              collapsed={false}
              user={user}
              userInitials={userInitials}
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              onWorkspaceChange={setCurrentWorkspace}
              onLogout={logout}
              onMobileClose={() => setMobileMenuOpen(false)}
              showMobileClose
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0 z-30 flex-shrink-0",
          className
        )}
      >
        <SidebarContent
          navItems={navItems}
          isActive={isActive}
          collapsed={sidebarCollapsed}
          user={user}
          userInitials={userInitials}
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          onWorkspaceChange={setCurrentWorkspace}
          onLogout={logout}
          onToggleCollapse={toggleSidebar}
        />
      </motion.aside>
    </>
  )
}

interface SidebarContentProps {
  navItems: typeof navItems
  isActive: (href: string) => boolean
  collapsed: boolean
  user: ReturnType<typeof useAuth>["user"]
  userInitials: string
  currentWorkspace: ReturnType<typeof useAuth>["currentWorkspace"]
  workspaces: ReturnType<typeof useAuth>["workspaces"]
  onWorkspaceChange: ReturnType<typeof useAuth>["setCurrentWorkspace"]
  onLogout: () => void
  onToggleCollapse?: () => void
  onMobileClose?: () => void
  showMobileClose?: boolean
}

function SidebarContent({
  navItems,
  isActive,
  collapsed,
  user,
  userInitials,
  currentWorkspace,
  workspaces,
  onWorkspaceChange,
  onLogout,
  onToggleCollapse,
  onMobileClose,
  showMobileClose,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2.5"
            >
              <div className="bg-primary rounded-lg p-1.5 flex-shrink-0">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-base text-sidebar-foreground truncate">
                AI Marketing OS
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="mx-auto bg-primary rounded-lg p-1.5">
            <Zap className="h-4 w-4 text-white" />
          </div>
        )}
        {showMobileClose ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMobileClose}
            className="text-sidebar-foreground/60"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )
        )}
      </div>

      {/* Workspace selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-9 px-3 hover:bg-sidebar-accent"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {currentWorkspace?.name?.[0]?.toUpperCase() ?? "W"}
                    </span>
                  </div>
                  <span className="text-sm font-medium truncate text-sidebar-foreground">
                    {currentWorkspace?.name ?? "Select workspace"}
                  </span>
                </div>
                <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => onWorkspaceChange(ws)}
                  className="gap-2"
                >
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {ws.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav items */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-sidebar-accent text-primary"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      active ? "text-primary" : "text-sidebar-foreground/60"
                    )}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 w-0.5 h-6 bg-primary rounded-r-full"
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User profile */}
      <div className="border-t border-sidebar-border px-3 py-3 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 hover:bg-sidebar-accent px-3",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate text-sidebar-foreground">
                    {user?.full_name ?? "User"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">
                    {user?.email ?? ""}
                  </p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function MobileMenuButton() {
  const { setMobileMenuOpen } = useUIStore()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMobileMenuOpen(true)}
      className="lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
