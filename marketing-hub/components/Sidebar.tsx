'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, Megaphone, Search, Rocket, User, TrendingUp, Share2, Film } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, accent: 'purple' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, accent: 'purple' },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone, accent: 'purple' },
  { href: '/seo', label: 'SEO Toolkit', icon: Search, accent: 'purple' },
]

const toolItems = [
  { href: '/fanpage', label: 'Fanpage Manager', icon: Share2, accent: 'blue' },
  { href: '/reels', label: 'Reels Discovery', icon: Film, accent: 'teal' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-[#0d0d1a] border-r border-white/10 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-white font-bold text-base leading-tight block">Marketing</span>
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold text-base leading-tight block">Hub</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">Main Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 text-white border border-purple-500/40 shadow-lg shadow-purple-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              {label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
              )}
            </Link>
          )
        })}

        <div className="pt-4">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">Tools</p>
          {toolItems.map(({ href, label, icon: Icon, accent }) => {
            const isActive = pathname === href
            const accentMap: Record<string, string> = {
              blue: 'from-blue-600/40 to-blue-500/40 border-blue-500/40 shadow-blue-500/10 text-blue-400',
              teal: 'from-teal-600/40 to-cyan-500/40 border-teal-500/40 shadow-teal-500/10 text-teal-400',
            }
            const iconInactive: Record<string, string> = {
              blue: 'group-hover:text-blue-400',
              teal: 'group-hover:text-teal-400',
            }
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? `bg-gradient-to-r ${accentMap[accent]} text-white border shadow-lg`
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? accentMap[accent].split(' ')[4] : `text-gray-500 ${iconInactive[accent]}`}`} />
                {label}
                {isActive && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${accentMap[accent].split(' ')[4].replace('text-', 'bg-')}`} />}
              </Link>
            )
          })}
        </div>

        <div className="pt-4">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">Analytics</p>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 cursor-default">
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            Reports
            <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">Soon</span>
          </div>
        </div>
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">Digital Marketer</p>
            <p className="text-gray-500 text-xs truncate">Pro Plan</p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
