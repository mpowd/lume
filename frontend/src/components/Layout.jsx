// src/components/Layout.jsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sparkles, MessageSquare, Bot, Database, BarChart3 } from 'lucide-react'

const navigation = [
  { name: 'Chat', href: '/', icon: MessageSquare },
  { name: 'Chatbots', href: '/chatbots', icon: Bot },
  { name: 'Knowledge Base', href: '/knowledge_base', icon: Database },
  { name: 'Evaluation', href: '/evaluation', icon: BarChart3 },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 bg-[#111111] border-r border-white/5
        transform transition-all duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Lume</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  w-full group relative overflow-hidden px-4 py-3 rounded-xl
                  flex items-center gap-3
                  transition-all cursor-pointer
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20' 
                    : 'hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-white/60'}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-white/90' : 'text-white/60'}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5">
          <div className="text-[11px] text-white/30 space-y-0.5">
            <div>Lume v1.0</div>
            <div>React + FastAPI</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}